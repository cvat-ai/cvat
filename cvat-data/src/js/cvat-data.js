/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:true
*/
// require("./decode_video")
const { MP4Reader, Bytestream } = require('./mp4');

const BlockType = Object.freeze({
    MP4VIDEO: 'mp4video',
    ARCHIVE: 'archive',
});


class Mutex {
    constructor() {
        this._lock = Promise.resolve();
    }
    _acquire() {
        var release;
        this._lock = new Promise(resolve => {
            release = resolve;
        });
        return release;
    }
    acquireQueued() {
        const q = this._lock.then(() => release);
        const release = this._acquire();
        return q;
    }
};

class FrameProvider {
    constructor(memory, blockType, blockSize) {
        this._frames = {};
        this._memory = Math.max(1, memory); // number of stored blocks
        this._blocks_ranges = [];
        this._blocks = {};
        this._blockSize = blockSize;
        this._running = false;
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
    };

    async _worker()
    {
        if (this._requestedBlockDecode != null &&
            this._decodeThreadCount < 2)
        {
            await this.startDecode();
        }
        this._timerId = setTimeout(this._worker.bind(this), 100);
    }

    is_chunk_cached(start, end)
    {
        return (`${start}:${end}` in this._blocks_ranges);
    }


    /* This method removes extra data from a cache when memory overflow */
    async _cleanup() {
        if (this._blocks_ranges.length > this._memory) {
            const shifted = this._blocks_ranges.shift(); // get the oldest block
            const [start, end] = shifted.split(':').map((el) => +el);
            delete this._blocks[start / this._blockSize];
            for (let i = start; i <= end; i++){
                delete this._frames[i];
            }
        }

        // delete frames whose are not in areas of current frame
        for (let i = 0; i < this._blocks_ranges.length; i++)
        {
            const [start, end] = this._blocks_ranges[i].split(':').map((el) => +el);

            let tmp_v = this._currFrame - 2 * this._blockSize;
            if (this._currFrame - 2 * this._blockSize < end &&
                this._currFrame - 2 * this._blockSize > start){
                for (let j = start; j <= end; j++) {
                    delete this._frames[j];
                }
            }

            tmp_v = this._currFrame + 2 * this._blockSize;
            if (this._currFrame + 2 * this._blockSize > start &&
                this._currFrame + 2 * this._blockSize < end){
                for (let j = start; j <= end; j++) {
                    delete this._frames[j];
                }
            }
        }
    }

    async requestDecodeBlock(block, start, end, resolveCallback, rejectCallback){
        const release = await this._mutex.acquireQueued();
        if (this._requestedBlockDecode != null) {
            this._requestedBlockDecode.rejectCallback();
        }
        if (! (`${start}:${end}` in this._decodingBlocks)) {
            if (block === null)
            {
                block = this._blocks[Math.floor((start+1) / chunkSize)];
            }
            this._requestedBlockDecode = {
                block : block,
                start : start,
                end : end,
                resolveCallback : resolveCallback,
                rejectCallback : rejectCallback,
            }
        }
        release();
    }

    isRequestExist() {
        return this._requestedBlockDecode != null;
    }

    setRenderSize(width, height){
        this._width = width
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
        if (this._blocks[nextChunkNum] === "loading"){
            return true;
        }
        else
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
        this._blocks[chunkNumber] = "loading";
    }

    cropImage(imageBuffer, imageWidth, imageHeight, xOffset, yOffset, width, height) {
        if (xOffset === 0 && width === imageWidth &&
            yOffset === 0 && height === imageHeight) {
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
        const height = this._height;
        const width = this._width;
         if (this._blockType === BlockType.MP4VIDEO){
            const release = await this._mutex.acquireQueued();
            const start = this._requestedBlockDecode.start;
            const end = this._requestedBlockDecode.end;
            const block = this._requestedBlockDecode.block;
            this._blocks_ranges.push(`${start}:${end}`);
            this._decodingBlocks[`${start}:${end}`] = this._requestedBlockDecode;
            this._requestedBlockDecode = null;

            for (let i = start; i <= end; i++){
                this._frames[i] = null;
            }

            this._blocks[Math.floor((start+1)/ this._blockSize)] = block;

            this._cleanup();

            const worker = new Worker('/static/engine/js/Decoder.js');

            let index = start;

            const t0 = performance.now();
            worker.onmessage = (e) => {
                if (e.data.consoleLog) { // ignore initialization message
                  return;
                }

                const scaleFactor = Math.ceil(this._height / e.data.height);
                this._frames[index] = this.cropImage(
                    e.data.buf, e.data.width, e.data.height, 0, 0,
                    Math.floor(width / scaleFactor), Math.floor(height / scaleFactor));

                this._decodingBlocks[`${start}:${end}`].resolveCallback(index);
                if (index in this._promisedFrames) {
                    this._promisedFrames[index].resolve(this._frames[index]);
                    delete this._promisedFrames[index];
                }
                if (index === end) {
                    const t = performance.now() - t0;
                    console.log(`Decode time : ${t}; fps: ${36000/t}`);
                    this._decodeThreadCount--;
                    delete this._decodingBlocks[`${start}:${end}`];
                    worker.terminate();
                }
                index++;
            };

            worker.onerror = (e) => {
                console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
                worker.terminate();
                this._decodeThreadCount--;
                // console.log(this._decodeThreadCount);

                for (let i = index; i <= end; i++){
                    if (i in this._promisedFrames) {
                        this._promisedFrames[i].reject();
                        delete this._promisedFrames[i];
                    }
                }

                this._decodingBlocks[`${start}:${end}`].rejectCallback();
                delete this._decodingBlocks[`${start}:${end}`];
            };

            worker.postMessage({
                type: "Broadway.js - Worker init",
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
            worker.postMessage({buf: sps, offset: 0, length: sps.length});
            worker.postMessage({buf: pps, offset: 0, length: pps.length});

            /* Decode Pictures */
            for (let sample = 0; sample < video.getSampleCount(); sample++){
                video.getSampleNALUnits(sample).forEach(nal => {
                    worker.postMessage({buf: nal, offset: 0, length: nal.length})
                });
            }
            this._decodeThreadCount++;
            release();

        } else {
            const release = await this._mutex.acquireQueued();
            let start = this._requestedBlockDecode.start;
            let end = this._requestedBlockDecode.end;
            let block = this._requestedBlockDecode.block;
            this._blocks_ranges.push(`${start}:${end}`);
            this._decodingBlocks[`${start}:${end}`] = this._requestedBlockDecode;
            this._requestedBlockDecode = null;

            const worker = new Worker('/static/engine/js/unzip_imgs.js');

            worker.onerror = (e) => {
                console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));

                for (let i = start; i <= end; i++) {
                    if (i in this._promisedFrames) {
                        this._promisedFrames[i].reject();
                         delete this._promisedFrames[i];
                    }
                }
                this._decodingBlocks[`${start}:${end}`].rejectCallback();
                this._decodeThreadCount--;
            };

            worker.postMessage({block : block,
                                start : start,
                                  end : end });
            this._decodeThreadCount++;

            worker.onmessage = (event) => {
                this._frames[event.data.index] = {
                    data: event.data.data,
                    width,
                    height,
                };
                this._decodingBlocks[`${start}:${end}`].resolveCallback(event.data.index);
                if (event.data.isEnd){
                        delete this._decodingBlocks[`${start}:${end}`];
                        this._decodeThreadCount--;
                }
            };

            release();
        }
    }

    get decodeThreadCount()
    {
        return this._decodeThreadCount;
    }

    /*
        Method returns a list of cached ranges
        Is an array of strings like "start:end"
    */
    get cachedFrames() {
        return [...this._blocks_ranges].sort(
            (a, b) => a.split(':')[0] - b.split(':')[0],
        );
    }
}

module.exports = {
    FrameProvider,
    BlockType,
};
