/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:true
*/
// require("./decode_video")
const BlockType = Object.freeze({
    TSVIDEO: 'tsvideo',
    ARCHIVE: 'archive',
});


class Mutex {
    constructor() {
        this._lock = Promise.resolve();
    }
    _acquire() {
        var release;
        const lock = this._lock = new Promise(resolve => {
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

    isRequestExist()
    {
        return this._requestedBlockDecode != null;
    }

    setRenderSize(width, height){
        this._width = width
        this._height = height;
    }

    /* Method returns frame from collection. Else method returns 0 */
    async frame(frameNumber) {        
        if (frameNumber in this._frames) {
           this._currFrame = frameNumber;
           return this._frames[frameNumber];
        }
        return null;
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

    async startDecode() {
         if (this._blockType === BlockType.TSVIDEO){

           
            const release = await this._mutex.acquireQueued();
            let start = this._requestedBlockDecode.start;
            let end = this._requestedBlockDecode.end;
            let block = this._requestedBlockDecode.block;           
            this._blocks_ranges.push(`${start}:${end}`);
            this._decodingBlocks[`${start}:${end}`] = this._requestedBlockDecode;
            this._requestedBlockDecode = null;         
            
            for (let i = start; i < end; i++){
                this._frames[i] = 'loading';
            }

            this._blocks[Math.floor((start+1)/ this._blockSize)] = block;
            
            this._cleanup();    

            const worker = new Worker('/static/engine/js/decode_video.js');

            worker.onerror = (function (e) {
                console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
                worker.terminate();
                this._decodeThreadCount--;
                // console.log(this._decodeThreadCount);
                this._decodingBlocks[`${start}:${end}`].rejectCallback();
                delete this._decodingBlocks[`${start}:${end}`];
            }).bind(this);

            worker.postMessage({block  : block, 
                                start  : start, 
                                  end  : end,
                                width  : this._width,
                                height : this._height});
            this._decodeThreadCount++;
            // console.log(this._decodeThreadCount);
            
            worker.onmessage = (function (event){
                // console.log("Decoded " + event.data.index + "frame");
                this._frames[event.data.index] = event.data.data;
                this._decodingBlocks[`${event.data.start}:${event.data.end}`].resolveCallback(event.data.index);
                if (event.data.isEnd) {
                    this._decodeThreadCount--;
                    // console.log("stop decoding " + event.data.start + " to " + event.data.end + " frames");
                    // console.log(this._decodeThreadCount);
                    delete this._decodingBlocks[`${event.data.start}:${event.data.end}`];
                }
            }).bind(this);
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

            worker.onerror = (function (e) {
                console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
                this._decodingBlocks[`${start}:${end}`].rejectCallback();
                this._decodeThreadCount--;
            });

            worker.postMessage({block : block, 
                                start : start, 
                                  end : end });
            this._decodeThreadCount++;
                        
            worker.onmessage = (function (event){
               this._frames[event.data.index] = event.data.data;
               this._decodingBlocks[`${start}:${end}`].resolveCallback(event.data.index);
               if (event.data.isEnd){
                    delete this._decodingBlocks[`${start}:${end}`];
                    this._decodeThreadCount--;
               }
            }).bind(this);

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
