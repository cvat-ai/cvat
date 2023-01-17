// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Mutex } from 'async-mutex';
import { MP4Reader, Bytestream } from './3rdparty/mp4';
import ZipDecoder from './unzip_imgs.worker';
import H264Decoder from './3rdparty/Decoder.worker';

export enum BlockType {
    MP4VIDEO = 'mp4video',
    ARCHIVE = 'archive',
}

export enum DimensionType {
    DIMENSION_3D = '3d',
    DIMENSION_2D = '2d',
}

export function decodeZip(
    block: any, start: number, end: number, dimension: any,
): Promise<Record<string, ImageBitmap>> {
    return new Promise((resolve, reject) => {
        decodeZip.mutex.acquire().then((release) => {
            const worker = new ZipDecoder();
            const result: Record<string, ImageBitmap> = {};
            let decoded = 0;

            worker.onerror = (e: ErrorEvent) => {
                release();
                worker.terminate();
                reject(new Error(`Archive can not be decoded. ${e.message}`));
            };

            worker.onmessage = async (event) => {
                const { error, fileName } = event.data;
                if (error) {
                    worker.onerror(new ErrorEvent('error', { message: error.toString() }));
                }

                const { data } = event.data;
                result[fileName.split('.')[0]] = data;
                decoded++;

                if (decoded === end) {
                    release();
                    worker.terminate();
                    resolve(result);
                }
            };

            worker.postMessage({
                block,
                start,
                end,
                dimension,
                dimension2D: DimensionType.DIMENSION_2D,
            });
        });
    });
}

decodeZip.mutex = new Mutex();

interface BlockToDecode {
    start: number;
    end: number;
    block: ArrayBuffer;
    resolveCallback: (frame: number) => void;
    rejectCallback: (e: ErrorEvent) => void;
}

export class FrameProvider {
    private blocksRanges: string[];
    private blockSize: number;
    private blockType: BlockType;

    /*
        ImageBitmap when decode zip chunks
        ImageData when decode video chunks
        Blob when 3D dimension
        null when not decoded yet
    */
    private frames: Record<string, ImageBitmap | ImageData | Blob | null>;
    private requestedBlockToDecode: null | BlockToDecode;
    private blocksAreBeingDecoded: Record<string, BlockToDecode>;
    private promisedFrames: Record<string, {
        resolve: (data: ImageBitmap | ImageData | Blob) => void;
        reject: () => void;
    }>;
    private currentDecodingThreads: number;
    private currentFrame: number;
    private mutex: Mutex;

    private dimension: DimensionType;
    private workerThreadsLimit: number;
    private cachedEncodedBlocksLimit: number;
    private cachedDecodedBlocksLimit: number;

    // used for video chunks to resize after decoding
    private renderWidth: number;
    private renderHeight: number;

    constructor(
        blockType: BlockType,
        blockSize: number,
        cachedBlockCount: number,
        decodedBlocksCacheSize = 5,
        maxWorkerThreadCount = 2,
        dimension: DimensionType = DimensionType.DIMENSION_2D,
    ) {
        this.mutex = new Mutex();
        this.blocksRanges = [];
        this.frames = {};
        this.promisedFrames = {};
        this.currentDecodingThreads = 0;
        this.currentFrame = -1;

        this.cachedEncodedBlocksLimit = Math.max(1, cachedBlockCount); // number of stored blocks
        this.cachedDecodedBlocksLimit = decodedBlocksCacheSize;
        this.workerThreadsLimit = maxWorkerThreadCount;
        this.dimension = dimension;

        this.renderWidth = 1920;
        this.renderHeight = 1080;
        this.blockSize = blockSize;
        this.blockType = blockType;

        // todo: sort out with logic of blocks
        this._blocks = {};
        this.requestedBlockToDecode = null;
        this.blocksAreBeingDecoded = {};

        setTimeout(this._checkDecodeRequests.bind(this), 100);
    }

    _checkDecodeRequests(): void {
        if (this.requestedBlockToDecode !== null && this.currentDecodingThreads < this.workerThreadsLimit) {
            this.startDecode().then(() => {
                setTimeout(this._checkDecodeRequests.bind(this), 100);
            });
        } else {
            setTimeout(this._checkDecodeRequests.bind(this), 100);
        }
    }

    isChunkCached(start: number, end: number): boolean {
        // todo: always returns false because this.blocksRanges is Array, not dictionary
        // but if try to correct other errors happens, need to debug..
        return `${start}:${end}` in this.blocksRanges;
    }

    /* This method removes extra data from a cache when memory overflow */
    async _cleanup(): Promise<void> {
        if (this.blocksRanges.length > this.cachedEncodedBlocksLimit) {
            const shifted = this.blocksRanges.shift(); // get the oldest block
            const [start, end] = shifted.split(':').map((el) => +el);
            delete this._blocks[Math.floor(start / this.blockSize)];
            for (let i = start; i <= end; i++) {
                delete this.frames[i];
            }
        }

        // delete frames whose are not in areas of current frame
        const distance = Math.floor(this.cachedDecodedBlocksLimit / 2);
        for (let i = 0; i < this.blocksRanges.length; i++) {
            const [start, end] = this.blocksRanges[i].split(':').map((el) => +el);
            if (
                end < this.currentFrame - distance * this.blockSize ||
                start > this.currentFrame + distance * this.blockSize
            ) {
                for (let j = start; j <= end; j++) {
                    delete this.frames[j];
                }
            }
        }
    }

    async requestDecodeBlock(
        block: ArrayBuffer,
        start: number,
        end: number,
        resolveCallback: () => void,
        rejectCallback: () => void,
    ): Promise<void> {
        const release = await this.mutex.acquire();
        try {
            if (this.requestedBlockToDecode !== null) {
                if (start === this.requestedBlockToDecode.start && end === this.requestedBlockToDecode.end) {
                    // only rewrite callbacks if the same block was requested again
                    this.requestedBlockToDecode.resolveCallback = resolveCallback;
                    this.requestedBlockToDecode.rejectCallback = rejectCallback;

                    // todo: should we reject the previous request here?
                } else if (this.requestedBlockToDecode.rejectCallback) {
                    // if another block requested, the previous request should be rejected
                    this.requestedBlockToDecode.rejectCallback();
                }
            }

            if (!(`${start}:${end}` in this.blocksAreBeingDecoded)) {
                this.requestedBlockToDecode = {
                    block: block || this._blocks[Math.floor(start / this.blockSize)],
                    start,
                    end,
                    resolveCallback,
                    rejectCallback,
                };
            } else {
                this.blocksAreBeingDecoded[`${start}:${end}`].rejectCallback = rejectCallback;
                this.blocksAreBeingDecoded[`${start}:${end}`].resolveCallback = resolveCallback;
            }
        } finally {
            release();
        }
    }

    setRenderSize(width: number, height: number): void {
        this.renderWidth = width;
        this.renderHeight = height;
    }

    /* Method returns frame from collection. Else method returns null */
    async frame(frameNumber: number): Promise<ImageBitmap | ImageData | Blob> {
        this.currentFrame = frameNumber;
        return new Promise((resolve, reject) => {
            if (frameNumber in this.frames) {
                if (this.frames[frameNumber] !== null) {
                    resolve(this.frames[frameNumber]);
                } else {
                    this.promisedFrames[frameNumber] = { resolve, reject };
                }
            } else {
                resolve(null);
            }
        });
    }

    isNextChunkExists(frameNumber: number): boolean {
        const nextChunkNum = Math.floor(frameNumber / this.blockSize) + 1;
        return nextChunkNum in this._blocks;
    }

    setReadyToLoading(chunkNumber: number): void {
        this._blocks[chunkNumber] = 'loading';
    }

    static cropImage(
        imageBuffer: ArrayBuffer,
        imageWidth: number,
        imageHeight: number,
        xOffset: number,
        yOffset: number,
        width: number,
        height: number,
    ): ImageData {
        if (xOffset === 0 && width === imageWidth && yOffset === 0 && height === imageHeight) {
            return new ImageData(new Uint8ClampedArray(imageBuffer), width, height);
        }
        const source = new Uint32Array(imageBuffer);

        const bufferSize = width * height * 4;
        const buffer = new ArrayBuffer(bufferSize);
        const rgbaInt32 = new Uint32Array(buffer);
        const rgbaInt8Clamped = new Uint8ClampedArray(buffer);

        if (imageWidth === width) {
            return new ImageData(new Uint8ClampedArray(imageBuffer, yOffset * 4, bufferSize), width, height);
        }

        let writeIdx = 0;
        for (let row = yOffset; row < height; row++) {
            const start = row * imageWidth + xOffset;
            rgbaInt32.set(source.subarray(start, start + width), writeIdx);
            writeIdx += width;
        }

        return new ImageData(rgbaInt8Clamped, width, height);
    }

    async startDecode(): Promise<void> {
        const release = await this.mutex.acquire();
        try {
            const height = this.renderHeight;
            const width = this.renderWidth;
            const { start, end, block } = this.requestedBlockToDecode;

            this.blocksRanges.push(`${start}:${end}`);
            this.blocksAreBeingDecoded[`${start}:${end}`] = this.requestedBlockToDecode;
            this.requestedBlockToDecode = null;
            this._blocks[Math.floor((start + 1) / this.blockSize)] = block;

            for (let i = start; i <= end; i++) {
                this.frames[i] = null;
            }

            this._cleanup();
            this.currentDecodingThreads++;

            if (this.blockType === BlockType.MP4VIDEO) {
                const worker = new H264Decoder();
                let index = start;

                worker.onmessage = (e) => {
                    if (e.data.consoleLog) {
                        // ignore initialization message
                        return;
                    }

                    const scaleFactor = Math.ceil(height / e.data.height);
                    this.frames[index] = FrameProvider.cropImage(
                        e.data.buf,
                        e.data.width,
                        e.data.height,
                        0,
                        0,
                        Math.floor(width / scaleFactor),
                        Math.floor(height / scaleFactor),
                    );

                    const { resolveCallback } = this.blocksAreBeingDecoded[`${start}:${end}`];
                    if (resolveCallback) {
                        resolveCallback(index);
                    }

                    if (index in this.promisedFrames) {
                        const { resolve } = this.promisedFrames[index];
                        delete this.promisedFrames[index];
                        resolve(this.frames[index]);
                    }

                    if (index === end) {
                        worker.terminate();
                        this.currentDecodingThreads--;
                        delete this.blocksAreBeingDecoded[`${start}:${end}`];
                    }

                    index++;
                };

                worker.onerror = (e: ErrorEvent) => {
                    worker.terminate();
                    this.currentDecodingThreads--;

                    for (let i = index; i <= end; i++) {
                        // reject all the following frames
                        if (i in this.promisedFrames) {
                            const { reject } = this.promisedFrames[i];
                            delete this.promisedFrames[i];
                            reject();
                        }
                    }

                    if (this.blocksAreBeingDecoded[`${start}:${end}`].rejectCallback) {
                        this.blocksAreBeingDecoded[`${start}:${end}`].rejectCallback(e);
                    }

                    delete this.blocksAreBeingDecoded[`${start}:${end}`];
                };

                worker.postMessage({
                    type: 'Broadway.js - Worker init',
                    options: {
                        rgb: true,
                        reuseMemory: false,
                    },
                });

                const reader = new MP4Reader(new Bytestream(block));
                reader.read();
                const video = reader.tracks[1];

                const avc = reader.tracks[1].trak.mdia.minf.stbl.stsd.avc1.avcC;
                const sps = avc.sps[0];
                const pps = avc.pps[0];

                /* Decode Sequence & Picture Parameter Sets */
                worker.postMessage({ buf: sps, offset: 0, length: sps.length });
                worker.postMessage({ buf: pps, offset: 0, length: pps.length });

                /* Decode Pictures */
                for (let sample = 0; sample < video.getSampleCount(); sample++) {
                    video.getSampleNALUnits(sample).forEach((nal) => {
                        worker.postMessage({ buf: nal, offset: 0, length: nal.length });
                    });
                }
            } else {
                const worker = new ZipDecoder();
                let index = start;

                worker.onmessage = async (event) => {
                    this.frames[event.data.index] = event.data.data;

                    const { resolveCallback } = this.blocksAreBeingDecoded[`${start}:${end}`];
                    if (resolveCallback) {
                        resolveCallback(event.data.index);
                    }

                    if (event.data.index in this.promisedFrames) {
                        const { resolve } = this.promisedFrames[event.data.index];
                        delete this.promisedFrames[event.data.index];
                        resolve(this.frames[event.data.index]);
                    }

                    if (index === end) {
                        worker.terminate();
                        this.currentDecodingThreads--;
                        delete this.blocksAreBeingDecoded[`${start}:${end}`];
                    }
                    index++;
                };

                worker.onerror = (e: ErrorEvent) => {
                    for (let i = start; i <= end; i++) {
                        if (i in this.promisedFrames) {
                            const { reject } = this.promisedFrames[i];
                            delete this.promisedFrames[i];
                            reject();
                        }
                    }
                    if (this.blocksAreBeingDecoded[`${start}:${end}`].rejectCallback) {
                        this.blocksAreBeingDecoded[`${start}:${end}`].rejectCallback(e);
                    }
                    this.currentDecodingThreads--;
                    worker.terminate();
                };

                worker.postMessage({
                    block,
                    start,
                    end,
                    dimension: this.dimension,
                    dimension2D: DimensionType.DIMENSION_2D,
                });
            }
        } finally {
            release();
        }
    }

    get decodedBlocksCacheSize(): number {
        return this.cachedDecodedBlocksLimit;
    }

    /*
        Method returns a list of cached ranges
        Is an array of strings like "start:end"
    */
    get cachedFrames(): string[] {
        return [...this.blocksRanges].sort((a, b) => +a.split(':')[0] - +b.split(':')[0]);
    }
}
