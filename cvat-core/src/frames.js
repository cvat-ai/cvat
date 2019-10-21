/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
    global:false
*/

(() => {
    const cvatData = require('../../cvat-data');
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const { isBrowser, isNode } = require('browser-or-node');
    const { Exception } = require('./exceptions');

    // This is the frames storage
    const frameDataCache = {};
    const frameCache = {};
    let nextChunk = null;

    /**
        * Class provides meta information about specific frame and frame itself
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class FrameData {
        constructor(width, height, tid, number) {
            Object.defineProperties(this, Object.freeze({
                /**
                    * @name width
                    * @type {integer}
                    * @memberof module:API.cvat.classes.FrameData
                    * @readonly
                    * @instance
                */
                width: {
                    value: width,
                    writable: false,
                },
                /**
                    * @name height
                    * @type {integer}
                    * @memberof module:API.cvat.classes.FrameData
                    * @readonly
                    * @instance
                */
                height: {
                    value: height,
                    writable: false,
                },
                tid: {
                    value: tid,
                    writable: false,
                },
                number: {
                    value: number,
                    writable: false,
                },
            }));
        }

        /**
            * Method returns URL encoded image which can be placed in the img tag
            * @method data
            * @returns {string}
            * @memberof module:API.cvat.classes.FrameData
            * @instance
            * @async
            * @param {function} [onServerRequest = () => {}]
            * callback which will be called if data absences local
            * @throws {module:API.cvat.exception.ServerError}
            * @throws {module:API.cvat.exception.PluginError}
        */
        async data(onServerRequest = () => {}) {
            const result = await PluginRegistry
                .apiWrapper.call(this, FrameData.prototype.data, onServerRequest);
            return result;
        }
    }

    FrameData.prototype.data.implementation = async function (onServerRequest) {
        async function getFrameData(resolve, reject) {
            function onDecode(provider, frameNumber) {
                if (frameNumber === this.number) {
                    resolve(provider.frame(frameNumber));
                }
            }

            if (isNode) {                
                resolve("Dummy data");
            } else if (isBrowser) {
                try {
                    const { provider } = frameDataCache[this.tid];
                    const { chunkSize } = frameDataCache[this.tid];
                    const frame = provider.frame(this.number);
                    if (frame === null || frame === 'loading') {
                        onServerRequest();                    
                        const start = parseInt(this.number / chunkSize, 10) * chunkSize;
                        const stop = (parseInt(this.number / chunkSize, 10) + 1) * chunkSize - 1;
                        const chunkNumber = Math.floor(this.number / chunkSize);
                        let chunk = null;
                        if (frame === null) {
                            chunk = await serverProxy.frames.getData(this.tid, chunkNumber);
                           
                        }
                        // if status is loading, a chunk has already been loaded
                        // and it is being decoded now

                        try {
                            provider.startDecode(chunk, start, stop, onDecode.bind(this, provider));
                        } catch (error) {
                            if (error.donePromise) {
                                try {
                                    await error.donePromise;
                                    provider.startDecode(chunk, start,
                                        stop, onDecode.bind(this, provider));
                                } catch (_) {
                                    reject(this.number);
                                }
                            }
                        }
                    } else {
                        if (this.number % chunkSize > 1){
                            if (!provider.isNextChunkExists(this.number)){
                                const nextChunkNumber = Math.floor(this.number / chunkSize) + 1;
                                provider.setReadyToLoading(nextChunkNumber);                            
                                serverProxy.frames.getData(this.tid, nextChunkNumber).then(nextChunk =>{
                                provider.startDecode(nextChunk, (nextChunkNumber) * chunkSize, (nextChunkNumber + 1) * chunkSize - 1, function(){});
                                });
                            }
                        }
                        resolve(frame);
                    }
                } catch (exception) {
                    if (exception instanceof Exception) {
                        reject(exception);
                    } else {
                        reject(new Exception(exception.message));
                    }
                }

            return new Promise(getFrameData.bind(this));
        }

       
    }
};

    async function getFrame(taskID, chunkSize, mode, frame) {
        if (!(taskID in frameDataCache)) {
            const blockType = mode === 'interpolation' ? cvatData.BlockType.TSVIDEO
                : cvatData.BlockType.ARCHIVE;

            const value = {
                meta: await serverProxy.frames.getMeta(taskID),
                chunkSize,
                provider: new cvatData.FrameProvider(3, blockType, chunkSize),
            };

            frameCache[taskID] = {};
            frameDataCache[taskID] = value;
        }

        let size = null;
        [size] = frameDataCache[taskID].meta;
        frameDataCache[taskID].provider.setRenderSize(size.width, size.height);

        return new FrameData(size.width, size.height, taskID, frame);
    }

    function getRanges(taskID) {
        if (!(taskID in frameDataCache)) {
            return [];
        }

        return frameDataCache[taskID].provider.cachedFrames;
    }


    module.exports = {
        FrameData,
        getFrame,
        getRanges,
    };
})();
