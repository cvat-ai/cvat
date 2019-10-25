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
    const { Exception, ArgumentError} = require('./exceptions');

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

            function rejectRequest() {
                reject(this.number);
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

                        provider.requestDecodeBlock(chunk, start, stop, onDecode.bind(this, provider), rejectRequest.bind(this));
                               
                    } else {                       
                        if (this.number % chunkSize > 1){
                            if (!provider.isNextChunkExists(this.number)){
                                const nextChunkNumber = Math.floor(this.number / chunkSize) + 1;
                                provider.setReadyToLoading(nextChunkNumber);                            
                                serverProxy.frames.getData(this.tid, nextChunkNumber).then(nextChunk =>{
                                    provider.requestDecodeBlock(nextChunk, (nextChunkNumber) * chunkSize, (nextChunkNumber + 1) * chunkSize - 1, 
                                                                function(){}, rejectRequest.bind(this, provider));
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
        }
    }
    return new Promise(getFrameData.bind(this));
};


    async function getPreview(taskID) {
        return new Promise(async (resolve, reject) => {
            try {
                // Just go to server and get preview (no any cache)
                const result = await serverProxy.frames.getPreview(taskID);
                if (isNode) {
                    resolve(global.Buffer.from(result, 'binary').toString('base64'));
                } else if (isBrowser) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve(reader.result);
                    };
                    reader.readAsDataURL(result);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async function getFrame(taskID, chunkSize, mode, frame) {
        if (!(taskID in frameDataCache)) {
            const blockType = mode === 'interpolation' ? cvatData.BlockType.TSVIDEO
                : cvatData.BlockType.ARCHIVE;

            const value = {
                meta: await serverProxy.frames.getMeta(taskID),
                chunkSize,
                provider: new cvatData.FrameProvider(9, blockType, chunkSize),
                lastFrameRequest : frame,
            };

            frameCache[taskID] = {};
            frameDataCache[taskID] = value;
        }
        
        let size = null;
        if (mode === 'interpolation') {
            [size] = frameDataCache[taskID].meta;            
        } else if (mode === 'annotation') {
            if (frame >= frameDataCache[taskID].meta.length) {
                throw new ArgumentError(
                    `Meta information about frame ${frame} can't be received from the server`,
                );
            } else {
                size = frameDataCache[taskID].meta[frame];
            }
        } else {
                throw new ArgumentError(
                    `Invalid mode is specified ${mode}`,
                );
            }

        frameDataCache[taskID].provider.setRenderSize(size.width, size.height);
        return new FrameData(size.width, size.height, taskID, frame);
    };

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
        getPreview,
    };
})();
