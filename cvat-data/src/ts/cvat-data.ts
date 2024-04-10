// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Mutex } from 'async-mutex';
import { MP4Reader, Bytestream } from './3rdparty/mp4';

export class RequestOutdatedError extends Error {}

export enum BlockType {
    MP4VIDEO = 'mp4video',
    ARCHIVE = 'archive',
}

export enum ChunkQuality {
    ORIGINAL = 'original',
    COMPRESSED = 'compressed',
}

export enum DimensionType {
    DIMENSION_3D = '3d',
    DIMENSION_2D = '2d',
}

export function decodeContextImages(
    block: any, start: number, end: number,
): Promise<Record<string, ImageBitmap>> {
    const decodeZipWorker = (decodeContextImages as any).zipWorker || new Worker(
        new URL('./unzip_imgs.worker', import.meta.url),
    );
    (decodeContextImages as any).zipWorker = decodeZipWorker;
    return new Promise((resolve, reject) => {
        decodeContextImages.mutex.acquire().then((release) => {
            const result: Record<string, ImageBitmap> = {};
            let decoded = 0;

            decodeZipWorker.onerror = (event: ErrorEvent) => {
                release();
                reject(event.error);
            };

            decodeZipWorker.onmessage = async (event) => {
                if (event.data.error) {
                    this.zipWorker.onerror(new ErrorEvent('error', {
                        error: event.data.error,
                    }));
                    return;
                }

                const { data, fileName } = event.data;
                result[fileName.split('.')[0]] = data;
                decoded++;

                if (decoded === end) {
                    release();
                    resolve(result);
                }
            };

            decodeZipWorker.postMessage({
                block,
                start,
                end,
                dimension: DimensionType.DIMENSION_2D,
                dimension2D: DimensionType.DIMENSION_2D,
            });
        });
    });
}

decodeContextImages.mutex = new Mutex();

interface BlockToDecode {
    start: number;
    end: number;
    block: ArrayBuffer;
    onDecodeAll(): void;
    onDecode(frame: number, bitmap: ImageBitmap | Blob): void;
    onReject(e: Error): void;
}

export class FrameDecoder {
    private blockType: BlockType;
    private chunkSize: number;
    /*
        ImageBitmap when decode zip or video chunks
        Blob when 3D dimension
        null when not decoded yet
    */
    private decodedChunks: Record<number, Record<number, ImageBitmap | Blob>>;
    private chunkIsBeingDecoded: BlockToDecode | null;
    private requestedChunkToDecode: BlockToDecode | null;
    private orderedStack: number[];
    private mutex: Mutex;
    private dimension: DimensionType;
    private cachedChunksLimit: number;
    // used for video chunks to get correct side after decoding
    private renderWidth: number;
    private renderHeight: number;
    private zipWorker: Worker;

    constructor(
        blockType: BlockType,
        chunkSize: number,
        cachedBlockCount: number,
        dimension: DimensionType = DimensionType.DIMENSION_2D,
    ) {
        this.mutex = new Mutex();
        this.orderedStack = [];

        this.cachedChunksLimit = Math.max(1, cachedBlockCount);
        this.dimension = dimension;

        this.renderWidth = 1920;
        this.renderHeight = 1080;
        this.chunkSize = chunkSize;
        this.blockType = blockType;

        this.decodedChunks = {};
        this.requestedChunkToDecode = null;
        this.chunkIsBeingDecoded = null;
    }

    isChunkCached(chunkNumber: number): boolean {
        return chunkNumber in this.decodedChunks;
    }

    hasFreeSpace(): boolean {
        return Object.keys(this.decodedChunks).length < this.cachedChunksLimit;
    }

    cleanup(extra = 1): void {
        // argument allows us to specify how many chunks we want to write after clear
        const chunks = Object.keys(this.decodedChunks).map((chunk: string) => +chunk);
        let { length } = chunks;
        while (length > this.cachedChunksLimit - Math.min(extra, this.cachedChunksLimit)) {
            const lastChunk = this.orderedStack.pop();
            if (typeof lastChunk === 'undefined') {
                return;
            }
            delete this.decodedChunks[lastChunk];
            length--;
        }
    }

    requestDecodeBlock(
        block: ArrayBuffer,
        start: number,
        end: number,
        onDecode: (frame: number, bitmap: ImageBitmap | Blob) => void,
        onDecodeAll: () => void,
        onReject: (e: Error) => void,
    ): void {
        if (this.requestedChunkToDecode !== null) {
            // a chunk was already requested to be decoded, but decoding didn't start yet
            if (start === this.requestedChunkToDecode.start && end === this.requestedChunkToDecode.end) {
                // it was the same chunk
                this.requestedChunkToDecode.onReject(new RequestOutdatedError());

                this.requestedChunkToDecode.onDecode = onDecode;
                this.requestedChunkToDecode.onReject = onReject;
            } else if (this.requestedChunkToDecode.onReject) {
                // it was other chunk
                this.requestedChunkToDecode.onReject(new RequestOutdatedError());
            }
        } else if (this.chunkIsBeingDecoded === null || this.chunkIsBeingDecoded.start !== start) {
            // everything was decoded or decoding other chunk is in process
            this.requestedChunkToDecode = {
                block,
                start,
                end,
                onDecode,
                onDecodeAll,
                onReject,
            };
        } else {
            // the same chunk is being decoded right now
            // reject previous decoding request
            this.chunkIsBeingDecoded.onReject(new RequestOutdatedError());

            this.chunkIsBeingDecoded.onReject = onReject;
            this.chunkIsBeingDecoded.onDecode = onDecode;
        }

        this.startDecode();
    }

    setRenderSize(width: number, height: number): void {
        this.renderWidth = width;
        this.renderHeight = height;
    }

    frame(frameNumber: number): ImageBitmap | Blob | null {
        const chunkNumber = Math.floor(frameNumber / this.chunkSize);
        if (chunkNumber in this.decodedChunks) {
            return this.decodedChunks[chunkNumber][frameNumber];
        }

        return null;
    }

    static cropImage(
        imageBuffer: ArrayBuffer,
        imageWidth: number,
        imageHeight: number,
        width: number,
        height: number,
    ): ImageData {
        if (width === imageWidth && height === imageHeight) {
            return new ImageData(new Uint8ClampedArray(imageBuffer), width, height);
        }
        const source = new Uint32Array(imageBuffer);

        const bufferSize = width * height * 4;
        if (imageWidth === width) {
            return new ImageData(new Uint8ClampedArray(imageBuffer, 0, bufferSize), width, height);
        }

        const buffer = new ArrayBuffer(bufferSize);
        const rgbaInt32 = new Uint32Array(buffer);
        const rgbaInt8Clamped = new Uint8ClampedArray(buffer);
        let writeIdx = 0;
        for (let row = 0; row < height; row++) {
            const start = row * imageWidth;
            rgbaInt32.set(source.subarray(start, start + width), writeIdx);
            writeIdx += width;
        }

        return new ImageData(rgbaInt8Clamped, width, height);
    }

    async startDecode(): Promise<void> {
        const blockToDecode = { ...this.requestedChunkToDecode };
        const release = await this.mutex.acquire();
        try {
            const { start, end, block } = this.requestedChunkToDecode;
            if (start !== blockToDecode.start) {
                // request is not relevant, another block was already requested
                // it happens when A is being decoded, B comes and wait for mutex, C comes and wait for mutex
                // B is not necessary anymore, because C already was requested
                blockToDecode.onReject(new RequestOutdatedError());
                throw new RequestOutdatedError();
            }

            const chunkNumber = Math.floor(start / this.chunkSize);
            this.orderedStack = [chunkNumber, ...this.orderedStack];
            this.cleanup();
            const decodedFrames: Record<number, ImageBitmap | Blob> = {};
            this.chunkIsBeingDecoded = this.requestedChunkToDecode;
            this.requestedChunkToDecode = null;

            if (this.blockType === BlockType.MP4VIDEO) {
                const worker = new Worker(
                    new URL('./3rdparty/Decoder.worker', import.meta.url),
                );
                let index = start;

                worker.onmessage = (e) => {
                    if (e.data.consoleLog) {
                        // ignore initialization message
                        return;
                    }
                    const keptIndex = index;

                    // do not use e.data.height and e.data.width because they might be not correct
                    // instead, try to understand real height and width of decoded image via scale factor
                    const scaleFactor = Math.ceil(this.renderHeight / e.data.height);
                    const height = Math.round(this.renderHeight / scaleFactor);
                    const width = Math.round(this.renderWidth / scaleFactor);

                    createImageBitmap(FrameDecoder.cropImage(
                        e.data.buf,
                        e.data.width,
                        e.data.height,
                        width,
                        height,
                    )).then((bitmap) => {
                        decodedFrames[keptIndex] = bitmap;
                        this.chunkIsBeingDecoded.onDecode(keptIndex, decodedFrames[keptIndex]);

                        if (keptIndex === end) {
                            this.decodedChunks[chunkNumber] = decodedFrames;
                            this.chunkIsBeingDecoded.onDecodeAll();
                            this.chunkIsBeingDecoded = null;
                            worker.terminate();
                            release();
                        }
                    });

                    index++;
                };

                worker.onerror = (event: ErrorEvent) => {
                    release();
                    worker.terminate();
                    this.chunkIsBeingDecoded.onReject(event.error);
                    this.chunkIsBeingDecoded = null;
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

                worker.postMessage({ buf: sps, offset: 0, length: sps.length });
                worker.postMessage({ buf: pps, offset: 0, length: pps.length });

                for (let sample = 0; sample < video.getSampleCount(); sample++) {
                    video.getSampleNALUnits(sample).forEach((nal) => {
                        worker.postMessage({ buf: nal, offset: 0, length: nal.length });
                    });
                }
            } else {
                this.zipWorker = this.zipWorker || new Worker(
                    new URL('./unzip_imgs.worker', import.meta.url),
                );
                let index = start;

                this.zipWorker.onmessage = async (event) => {
                    if (event.data.error) {
                        this.zipWorker.onerror(new ErrorEvent('error', {
                            error: event.data.error,
                        }));
                        return;
                    }

                    decodedFrames[event.data.index] = event.data.data as ImageBitmap | Blob;
                    this.chunkIsBeingDecoded.onDecode(event.data.index, decodedFrames[event.data.index]);

                    if (index === end) {
                        this.decodedChunks[chunkNumber] = decodedFrames;
                        this.chunkIsBeingDecoded.onDecodeAll();
                        this.chunkIsBeingDecoded = null;
                        release();
                    }
                    index++;
                };

                this.zipWorker.onerror = (event: ErrorEvent) => {
                    release();
                    this.chunkIsBeingDecoded.onReject(event.error);
                    this.chunkIsBeingDecoded = null;
                };

                this.zipWorker.postMessage({
                    block,
                    start,
                    end,
                    dimension: this.dimension,
                    dimension2D: DimensionType.DIMENSION_2D,
                });
            }
        } catch (error) {
            this.chunkIsBeingDecoded = null;
            release();
        }
    }

    public cachedChunks(includeInProgress = false): number[] {
        const chunkIsBeingDecoded = includeInProgress && this.chunkIsBeingDecoded ?
            Math.floor(this.chunkIsBeingDecoded.start / this.chunkSize) : null;
        return Object.keys(this.decodedChunks).map((chunkNumber: string) => +chunkNumber).concat(
            ...(chunkIsBeingDecoded !== null ? [chunkIsBeingDecoded] : []),
        ).sort((a, b) => a - b);
    }
}
