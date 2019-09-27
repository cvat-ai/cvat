/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:true
*/

const BlockType = Object.freeze({
    TSVIDEO: 'tsvideo',
    ARCHIVE: 'archive',
});

class FrameProvider {
    constructor(memory, blockType) {
        this._frames = {};
        this._memory = Math.max(1, memory); // number of stored blocks
        this._blocks = [];
        this._running = false;
        this._blockType = blockType;
        this._currFrame = -1;
    }

    /* This method removes extra data from a cache when memory overflow */
    _cleanup() {
        if (this._blocks.length > this._memory) {
            const shifted = this._blocks.shift(); // get the oldest block
            const [start, end] = shifted.split(':').map((el) => +el);

            // remove all frames within this block
            for (let i = start; i <= end; i++) {
                delete this._frames[i];
            }
        }
    }

    /* Method returns frame from collection. Else method returns 0 */
    frame(frameNumber) {
        if (frameNumber in this._frames) {
            return this._frames[frameNumber];
        }
        return null;
    }


    /*
        Method start asynchronic decode a block of data

        @param block - is a data from a server as is (ts file or archive)
        @param start {number} - is the first frame of a block
        @param end {number} - is the last frame of a block + 1
        @param callback - callback)

    */

    startDecode(block, start, end, callback)
    {
         if (this._blockType === BlockType.TSVIDEO){
            if (this._running) {
                throw new Error('Decoding has already running');
            }

            this._blocks.push(`${start}:${end}`);
            this._cleanup();            

            const worker = new Worker('decode_video.js');

            worker.onerror = (function (event) {
                console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
            });

            worker.postMessage({block : block, 
                                start : start, 
                                  end : end });
            

            worker.onmessage = (function (event){
                this._frames[event.data.index] = event.data.data;
                callback(event.data.index);
            }).bind(this);
           
        } else {
            const worker = new Worker('unzip_imgs.js');

            worker.onerror = (function (event) {
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
        return [...this._blocks].sort(
            (a, b) => a.split(':')[0] - b.split(':')[0],
        );
    }
}

module.exports = {
    FrameProvider,
    BlockType,
};
