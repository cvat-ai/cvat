// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const { Mutex } = require('async-mutex');
// eslint-disable-next-line max-classes-per-file
const { MP4Reader, Bytestream } = require('./3rdparty/mp4');
const ZipDecoder = require('./unzip_imgs.worker');
const H264Decoder = require('./3rdparty/Decoder.worker');

const BlockType = Object.freeze({
    MP4VIDEO: 'mp4video',
    ARCHIVE: 'archive',
});

const DimensionType = Object.freeze({
    DIM_3D: '3d',
    DIM_2D: '2d',
});

class FrameProvider {
    constructor(
        blockType,
        blockSize,
        cachedBlockCount,
        decodedBlocksCacheSize = 5,
        maxWorkerThreadCount = 2,
        dimension = DimensionType.DIM_2D,
    ) {
        this._frames = {};
        this._cachedBlockCount = Math.max(1, cachedBlockCount); // number of stored blocks
        this._decodedBlocksCacheSize = decodedBlocksCacheSize;
        this._blocksRanges = [];
        this._blocks = {};
        this._running = false;
        this._blockSize = blockSize;
        this._blockType = blockType;
        this._currFrame = -1;
        this._requestedBlockDecode = null;
        this._width = null;
        this._height = null;
        this._decodingBlocks = {};
        this._decodeThreadCount = 0;
        this._timerId = setTimeout(this._worker.bind(this), 100);
        this._mutex = new Mutex();
        this._promisedFrames = {};
        this._maxWorkerThreadCount = maxWorkerThreadCount;
        this._dimension = dimension;
    }

    async _worker() {
        if (this._requestedBlockDecode !== null && this._decodeThreadCount < this._maxWorkerThreadCount) {
            await this.startDecode();
        }
        this._timerId = setTimeout(this._worker.bind(this), 100);
    }

    isChunkCached(start, end) {
        return `${start}:${end}` in this._blocksRanges;
    }

    /* This method removes extra data from a cache when memory overflow */
    async _cleanup() {
        if (this._blocksRanges.length > this._cachedBlockCount) {
            const shifted = this._blocksRanges.shift(); // get the oldest block
            const [start, end] = shifted.split(':').map((el) => +el);
            delete this._blocks[start / this._blockSize];
            for (let i = start; i <= end; i++) {
                delete this._frames[i];
            }
        }

        // delete frames whose are not in areas of current frame
        const distance = Math.floor(this._decodedBlocksCacheSize / 2);
        for (let i = 0; i < this._blocksRanges.length; i++) {
            const [start, end] = this._blocksRanges[i].split(':').map((el) => +el);
            if (
                end < this._currFrame - distance * this._blockSize ||
                start > this._currFrame + distance * this._blockSize
            ) {
                for (let j = start; j <= end; j++) {
                    delete this._frames[j];
                }
            }
        }
    }

    async requestDecodeBlock(block, start, end, resolveCallback, rejectCallback) {
        const release = await this._mutex.acquire();
        try {
            if (this._requestedBlockDecode !== null) {
                if (start === this._requestedBlockDecode.start && end === this._requestedBlockDecode.end) {
                    this._requestedBlockDecode.resolveCallback = resolveCallback;
                    this._requestedBlockDecode.rejectCallback = rejectCallback;
                } else if (this._requestedBlockDecode.rejectCallback) {
                    this._requestedBlockDecode.rejectCallback();
                }
            }
            if (!(`${start}:${end}` in this._decodingBlocks)) {
                this._requestedBlockDecode = {
                    block: block || this._blocks[Math.floor(start / this._blockSize)],
                    start,
                    end,
                    resolveCallback,
                    rejectCallback,
                };
            } else {
                this._decodingBlocks[`${start}:${end}`].rejectCallback = rejectCallback;
                this._decodingBlocks[`${start}:${end}`].resolveCallback = resolveCallback;
            }
        } finally {
            release();
        }
    }

    isRequestExist() {
        return this._requestedBlockDecode !== null;
    }

    setRenderSize(width, height) {
        this._width = width;
        this._height = height;
    }

    /* Method returns frame from collection. Else method returns 0 */
    async frame(frameNumber) {
        this._currFrame = frameNumber;
        return new Promise((resolve, reject) => {
            if (frameNumber in this._frames) {
                if (this._frames[frameNumber] !== null) {
                    resolve(this._frames[frameNumber]);
                } else {
                    this._promisedFrames[frameNumber] = {
                        resolve,
                        reject,
                    };
                }
            } else {
                resolve(null);
            }
        });
    }

    isNextChunkExists(frameNumber) {
        const nextChunkNum = Math.floor(frameNumber / this._blockSize) + 1;
        if (this._blocks[nextChunkNum] === 'loading') {
            return true;
        }

        return nextChunkNum in this._blocks;
    }

    /*
        Method start asynchronic decode a block of data

        @param block - is a data from a server as is (ts file or archive)
        @param start {number} - is the first frame of a block
        @param end {number} - is the last frame of a block + 1
        @param callback - callback)

    */

    setReadyToLoading(chunkNumber) {
        this._blocks[chunkNumber] = 'loading';
    }

    static cropImage(imageBuffer, imageWidth, imageHeight, xOffset, yOffset, width, height) {
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

    async startDecode() {
        const release = await this._mutex.acquire();
        try {
            const height = this._height;
            const width = this._width;
            const { start, end, block } = this._requestedBlockDecode;

            this._blocksRanges.push(`${start}:${end}`);
            this._decodingBlocks[`${start}:${end}`] = this._requestedBlockDecode;
            this._requestedBlockDecode = null;
            this._blocks[Math.floor((start + 1) / this._blockSize)] = block;
            for (let i = start; i <= end; i++) {
                this._frames[i] = null;
            }
            this._cleanup();
            if (this._blockType === BlockType.MP4VIDEO) {
                const worker = new H264Decoder();
                let index = start;

                worker.onmessage = (e) => {
                    if (e.data.consoleLog) {
                        // ignore initialization message
                        return;
                    }

                    const scaleFactor = Math.ceil(this._height / e.data.height);
                    this._frames[index] = FrameProvider.cropImage(
                        e.data.buf,
                        e.data.width,
                        e.data.height,
                        0,
                        0,
                        Math.floor(width / scaleFactor),
                        Math.floor(height / scaleFactor),
                    );

                    if (this._decodingBlocks[`${start}:${end}`].resolveCallback) {
                        this._decodingBlocks[`${start}:${end}`].resolveCallback(index);
                    }

                    if (index in this._promisedFrames) {
                        this._promisedFrames[index].resolve(this._frames[index]);
                        delete this._promisedFrames[index];
                    }
                    if (index === end) {
                        this._decodeThreadCount--;
                        delete this._decodingBlocks[`${start}:${end}`];
                        worker.terminate();
                    }
                    index++;
                };

                worker.onerror = (e) => {
                    worker.terminate();
                    this._decodeThreadCount--;

                    for (let i = index; i <= end; i++) {
                        if (i in this._promisedFrames) {
                            this._promisedFrames[i].reject();
                            delete this._promisedFrames[i];
                        }
                    }

                    if (this._decodingBlocks[`${start}:${end}`].rejectCallback) {
                        this._decodingBlocks[`${start}:${end}`].rejectCallback(Error(e));
                    }
                    delete this._decodingBlocks[`${start}:${end}`];
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
                this._decodeThreadCount++;
            } else {
                const worker = new ZipDecoder();
                let index = start;

                worker.onerror = (e) => {
                    for (let i = start; i <= end; i++) {
                        if (i in this._promisedFrames) {
                            this._promisedFrames[i].reject();
                            delete this._promisedFrames[i];
                        }
                    }
                    if (this._decodingBlocks[`${start}:${end}`].rejectCallback) {
                        this._decodingBlocks[`${start}:${end}`].rejectCallback(Error(e));
                    }
                    this._decodeThreadCount--;
                    worker.terminate();
                };

                worker.onmessage = async (event) => {
                    if (this._dimension === DimensionType.DIM_2D && event.data.isRaw) {
                        // safary doesn't support createImageBitmap
                        // there is a way to polyfill it with using document.createElement
                        // but document.createElement doesn't work in worker
                        // so, we get raw data and decode it here, no other way

                        const createImageBitmap = async function (blob) {
                            return new Promise((resolve) => {
                                const img = document.createElement('img');
                                img.addEventListener('load', function loadListener() {
                                    resolve(this);
                                });
                                img.src = URL.createObjectURL(blob);
                            });
                        };

                        // eslint-disable-next-line
                        event.data.data = await createImageBitmap(event.data.data);
                    }

                    this._frames[event.data.index] = event.data.data;

                    if (this._decodingBlocks[`${start}:${end}`].resolveCallback) {
                        this._decodingBlocks[`${start}:${end}`].resolveCallback(event.data.index);
                    }

                    if (event.data.index in this._promisedFrames) {
                        this._promisedFrames[event.data.index].resolve(this._frames[event.data.index]);
                        delete this._promisedFrames[event.data.index];
                    }

                    if (index === end) {
                        worker.terminate();
                        delete this._decodingBlocks[`${start}:${end}`];
                        this._decodeThreadCount--;
                    }
                    index++;
                };
                const dimension = this._dimension;
                worker.postMessage({
                    block,
                    start,
                    end,
                    dimension,
                    dimension2D: DimensionType.DIM_2D,
                });
                this._decodeThreadCount++;
            }
        } finally {
            release();
        }
    }

    get decodeThreadCount() {
        return this._decodeThreadCount;
    }

    get decodedBlocksCacheSize() {
        return this._decodedBlocksCacheSize;
    }

    /*
        Method returns a list of cached ranges
        Is an array of strings like "start:end"
    */
    get cachedFrames() {
        return [...this._blocksRanges].sort((a, b) => a.split(':')[0] - b.split(':')[0]);
    }
}

module.exports = {
    FrameProvider,
    BlockType,
    DimensionType,
};
