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
        this._width = null;
        this._height = null;
    }

    /* This method removes extra data from a cache when memory overflow */
    _cleanup() {
        if (this._blocks_ranges.length > this._memory) {
            const shifted = this._blocks_ranges.shift(); // get the oldest block
            const [start, end] = shifted.split(':').map((el) => +el);
            delete this._blocks[start / this._blockSize];
        }

        // remove frames from pre-previose blocks
        if (this._blocks_ranges.length > 1)
        {
            const secondFromEnd = this._blocks_ranges[this._blocks_ranges.length - 2];
            const [start, end] = secondFromEnd.split(':').map((el) => +el);
            for (let i = start; i <= end; i++) {
                delete this._frames[i];
            }
        }
    }

    setRenderSize(width, height){
        this._width = width;
        this._height = height;
    }

    /* Method returns frame from collection. Else method returns 0 */
    frame(frameNumber) {        
        if (frameNumber in this._frames) {
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

    startDecode(block, start, end, callback)
    {
         if (this._blockType === BlockType.TSVIDEO){
            if (this._running) {
                throw new Error('Decoding has already running');
            }

            for (let i = start; i < end; i++){
                this._frames[i] = 'loading';
            }

            this._blocks[Math.floor((start+1)/ this._blockSize)] = block;
            this._blocks_ranges.push(`${start}:${end}`);
            this._cleanup();    

            const worker = new Worker('/static/engine/js/decode_video.js');

            worker.onerror = (function (e) {
                console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
            });

            worker.postMessage({block : block, 
                                start : start, 
                                  end : end,
                                width : this._width,
                                height : this._height});
            

            worker.onmessage = (function (event){
                this._frames[event.data.index] = event.data.data;
                callback(event.data.index);
            }).bind(this);
           
        } else {
            const worker = new Worker('/static/engine/js/unzip_imgs.js');

            worker.onerror = (function (e) {
                console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
            });

            worker.postMessage({block : block, 
                                start : start, 
                                  end : end });

            
            worker.onmessage = (function (event){
                this._frames[event.data.index] = event.data.data;
                callback(event.data.index);

            }).bind(this);
        }
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
