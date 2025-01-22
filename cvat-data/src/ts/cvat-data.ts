// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
    chunkFrameNumbers: number[];
    chunkIndex: number;
    block: ArrayBuffer;
    onDecodeAll(): void;
    onDecode(frame: number, bitmap: ImageBitmap | Blob): void;
    onReject(e: Error): void;
}

export class FrameDecoder {
    private blockType: BlockType;
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
    private zipWorker: Worker | null;
    private videoWorker: Worker | null;
    private getChunkIndex: (frame: number) => number;

    constructor(
        blockType: BlockType,
        cachedBlockCount: number,
        getChunkIndex: (frame: number) => number,
        dimension: DimensionType = DimensionType.DIMENSION_2D,
    ) {
        this.mutex = new Mutex();
        this.orderedStack = [];
        this.zipWorker = null;
        this.videoWorker = null;

        this.cachedChunksLimit = Math.max(1, cachedBlockCount);
        this.dimension = dimension;

        this.renderWidth = 1920;
        this.renderHeight = 1080;
        this.getChunkIndex = getChunkIndex;
        this.blockType = blockType;

        this.decodedChunks = {};
        this.requestedChunkToDecode = null;
        this.chunkIsBeingDecoded = null;
    }

    isChunkCached(chunkIndex: number): boolean {
        return chunkIndex in this.decodedChunks;
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

            for (const frame of Object.keys(this.decodedChunks[lastChunk])) {
                const data = this.decodedChunks[lastChunk][frame];
                if (data instanceof ImageBitmap) {
                    data.close();
                }
            }

            delete this.decodedChunks[lastChunk];
            length--;
        }
    }

    private validateFrameNumbers(frameNumbers: number[]): void {
        if (!Array.isArray(frameNumbers) || !frameNumbers.length) {
            throw new Error('chunkFrameNumbers must not be empty');
        }

        // ensure is ordered
        for (let i = 1; i < frameNumbers.length; ++i) {
            const prev = frameNumbers[i - 1];
            const current = frameNumbers[i];
            if (current <= prev) {
                throw new Error(
                    'chunkFrameNumbers must be sorted in the ascending order, ' +
                    `got a (${prev}, ${current}) pair instead`,
                );
            }
        }
    }

    requestDecodeBlock(
        block: ArrayBuffer,
        chunkIndex: number,
        chunkFrameNumbers: number[],
        onDecode: (frame: number, bitmap: ImageBitmap | Blob) => void,
        onDecodeAll: () => void,
        onReject: (e: Error) => void,
    ): void {
        this.validateFrameNumbers(chunkFrameNumbers);

        if (this.requestedChunkToDecode !== null) {
            // a chunk was already requested to be decoded, but decoding didn't start yet
            if (chunkIndex === this.requestedChunkToDecode.chunkIndex) {
                // it was the same chunk
                this.requestedChunkToDecode.onReject(new RequestOutdatedError());

                this.requestedChunkToDecode.onDecode = onDecode;
                this.requestedChunkToDecode.onReject = onReject;
            } else if (this.requestedChunkToDecode.onReject) {
                // it was other chunk
                this.requestedChunkToDecode.onReject(new RequestOutdatedError());
            }
        } else if (this.chunkIsBeingDecoded === null ||
            chunkIndex !== this.chunkIsBeingDecoded.chunkIndex
        ) {
            // everything was decoded or decoding other chunk is in process
            this.requestedChunkToDecode = {
                chunkFrameNumbers,
                chunkIndex,
                block,
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
        const chunkIndex = this.getChunkIndex(frameNumber);
        if (chunkIndex in this.decodedChunks) {
            return this.decodedChunks[chunkIndex][frameNumber];
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
        const releaseMutex = await this.mutex.acquire();
        const release = (): void => {
            if (this.videoWorker) {
                this.videoWorker.terminate();
                this.videoWorker = null;
            }

            releaseMutex();
        };
        try {
            const { chunkFrameNumbers, chunkIndex, block } = this.requestedChunkToDecode;
            if (chunkIndex !== blockToDecode.chunkIndex) {
                // request is not relevant, another block was already requested
                // it happens when A is being decoded, B comes and wait for mutex, C comes and wait for mutex
                // B is not necessary anymore, because C already was requested
                blockToDecode.onReject(new RequestOutdatedError());
                throw new RequestOutdatedError();
            }

            const getFrameNumber = (chunkFrameIndex: number): number => (
                chunkFrameNumbers[chunkFrameIndex]
            );

            this.orderedStack = [chunkIndex, ...this.orderedStack];
            this.cleanup();
            const decodedFrames: Record<number, ImageBitmap | Blob> = {};
            this.chunkIsBeingDecoded = this.requestedChunkToDecode;
            this.requestedChunkToDecode = null;

            if (this.blockType === BlockType.MP4VIDEO) {
                this.videoWorker = new Worker(
                    new URL('./3rdparty/Decoder.worker', import.meta.url),
                );
                let index = 0;

                this.videoWorker.onmessage = (e) => {
                    if (e.data.consoleLog) {
                        // ignore initialization message
                        return;
                    }
                    const keptIndex = index;
                    const frameNumber = getFrameNumber(keptIndex);

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
                        decodedFrames[frameNumber] = bitmap;
                        this.chunkIsBeingDecoded.onDecode(frameNumber, decodedFrames[frameNumber]);

                        if (keptIndex === chunkFrameNumbers.length - 1) {
                            this.decodedChunks[chunkIndex] = decodedFrames;
                            this.chunkIsBeingDecoded.onDecodeAll();
                            this.chunkIsBeingDecoded = null;
                            release();
                        }
                    });

                    index++;
                };

                this.videoWorker.onerror = (event: ErrorEvent) => {
                    release();
                    this.chunkIsBeingDecoded.onReject(event.error);
                    this.chunkIsBeingDecoded = null;
                };

                this.videoWorker.postMessage({
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

                this.videoWorker.postMessage({ buf: sps, offset: 0, length: sps.length });
                this.videoWorker.postMessage({ buf: pps, offset: 0, length: pps.length });

                for (let sample = 0; sample < video.getSampleCount(); sample++) {
                    video.getSampleNALUnits(sample).forEach((nal) => {
                        this.videoWorker.postMessage({ buf: nal, offset: 0, length: nal.length });
                    });
                }
            } else {
                this.zipWorker = this.zipWorker || new Worker(
                    new URL('./unzip_imgs.worker', import.meta.url),
                );
                let decodedCount = 0;

                this.zipWorker.onmessage = async (event) => {
                    if (event.data.error) {
                        this.zipWorker.onerror(new ErrorEvent('error', {
                            error: event.data.error,
                        }));
                        return;
                    }

                    const frameNumber = getFrameNumber(event.data.index);
                    decodedFrames[frameNumber] = event.data.data as ImageBitmap | Blob;
                    this.chunkIsBeingDecoded.onDecode(frameNumber, decodedFrames[frameNumber]);

                    if (decodedCount === chunkFrameNumbers.length - 1) {
                        this.decodedChunks[chunkIndex] = decodedFrames;
                        this.chunkIsBeingDecoded.onDecodeAll();
                        this.chunkIsBeingDecoded = null;
                        release();
                    }

                    decodedCount++;
                };

                this.zipWorker.onerror = (event: ErrorEvent) => {
                    release();
                    this.chunkIsBeingDecoded.onReject(event.error);
                    this.chunkIsBeingDecoded = null;
                };

                this.zipWorker.postMessage({
                    block,
                    start: 0,
                    end: chunkFrameNumbers.length - 1,
                    dimension: this.dimension,
                    dimension2D: DimensionType.DIMENSION_2D,
                });
            }
        } catch (error) {
            this.chunkIsBeingDecoded = null;
            release();
        }
    }

    public close(): void {
        if (this.zipWorker) {
            this.zipWorker.terminate();
            this.zipWorker = null;
        }

        if (this.videoWorker) {
            this.videoWorker.terminate();
            this.videoWorker = null;
        }

        this.cleanup(Number.MAX_SAFE_INTEGER);
    }

    public cachedChunks(includeInProgress = false): number[] {
        const chunkIsBeingDecoded = (
            includeInProgress && this.chunkIsBeingDecoded ?
                this.chunkIsBeingDecoded.chunkIndex :
                null
        );
        return Object.keys(this.decodedChunks).map((chunkIndex: string) => +chunkIndex).concat(
            ...(chunkIsBeingDecoded !== null ? [chunkIsBeingDecoded] : []),
        ).sort((a, b) => a - b);
    }
}
