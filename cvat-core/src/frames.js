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

    /**
        * Class provides meta information about specific frame and frame itself
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class FrameData {
        constructor(width, height, tid, number, startFrame, stopFrame) {
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
                startFrame: {
                    value: startFrame,
                    writable: false,
                },
                stopFrame: {
                    value: stopFrame,
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
        return new Promise( async (resolve, reject) => {
            const onDecodeAll = (frameNumber) => {
                if (frameDataCache[this.tid].activeChunkRequest && chunkNumber === frameDataCache[this.tid].activeChunkRequest.chunkNumber) {
                    const callbackArray = frameDataCache[this.tid].activeChunkRequest.callbacks;
                    if (callbackArray.length) {
                        const lastRequest = callbackArray.pop();
                        frameDataCache[this.tid].activeChunkRequest = undefined;
                        lastRequest.resolve(provider.frame(frameNumber));
                    }
                }
            };

            const rejectRequestAll = () => {
                if (frameDataCache[this.tid].activeChunkRequest && chunkNumber === frameDataCache[this.tid].activeChunkRequest.chunkNumber) {
                    for (const r of frameDataCache[this.tid].activeChunkRequest.callbacks) {
                        r.reject(r.frameNumber);
                    }
                    frameDataCache[this.tid].activeChunkRequest = undefined;
                }
            };

            const makeActiveRequest = () => {
                const activeChunk = frameDataCache[this.tid].activeChunkRequest
                activeChunk.request = serverProxy.frames.getData(this.tid, activeChunk.chunkNumber).then(
                    (chunk) => {
                        frameDataCache[this.tid].activeChunkRequest.completed = true;
                        provider.requestDecodeBlock(chunk,
                            frameDataCache[this.tid].activeChunkRequest.start,
                            frameDataCache[this.tid].activeChunkRequest.stop,
                            frameDataCache[this.tid].activeChunkRequest.onDecodeAll,
                            frameDataCache[this.tid].activeChunkRequest.rejectRequestAll
                        );
                }).catch(exception => {
                    if (exception instanceof Exception) {
                        reject(exception);
                    } else {
                        reject(new Exception(exception.message));
                    }
                }).finally(() => {
                    if (frameDataCache[this.tid].nextChunkRequest) {
                        if (frameDataCache[this.tid].activeChunkRequest) {
                            for (const r of frameDataCache[this.tid].activeChunkRequest.callbacks) {
                                r.reject(r.frameNumber);
                            }
                        }
                        frameDataCache[this.tid].activeChunkRequest = frameDataCache[this.tid].nextChunkRequest;
                        frameDataCache[this.tid].nextChunkRequest = undefined;
                        makeActiveRequest();
                    }
                });
            };

            const { provider } = frameDataCache[this.tid];
            const { chunkSize } = frameDataCache[this.tid];
            const start = Math.max(this.startFrame, parseInt(this.number / chunkSize, 10) * chunkSize);
            const stop =  Math.min(this.stopFrame, (parseInt(this.number / chunkSize, 10) + 1) * chunkSize - 1);
            const chunkNumber = Math.floor(this.number / chunkSize);

            if (isNode) {
                resolve("Dummy data");
            } else if (isBrowser) {
                try {
                    const { decodedBlocksCacheSize } = frameDataCache[this.tid];
                    let frame = await provider.frame(this.number);
                    if (frame === null) {
                        onServerRequest();
                        if (!provider.is_chunk_cached(start, stop)) {
                            if (!frameDataCache[this.tid].activeChunkRequest || (frameDataCache[this.tid].activeChunkRequest && frameDataCache[this.tid].activeChunkRequest.completed)) {
                                if (frameDataCache[this.tid].activeChunkRequest) {
                                    frameDataCache[this.tid].activeChunkRequest.rejectRequestAll();
                                }
                                frameDataCache[this.tid].activeChunkRequest = {
                                    request: undefined,
                                    chunkNumber,
                                    start,
                                    stop,
                                    onDecodeAll,
                                    rejectRequestAll,
                                    completed: false,
                                    callbacks: [{
                                        resolve,
                                        reject,
                                        frameNumber: this.number,
                                    }],
                                };
                                makeActiveRequest();
                            } else {
                                if (frameDataCache[this.tid].activeChunkRequest.chunkNumber === chunkNumber) {
                                    frameDataCache[this.tid].activeChunkRequest.callbacks.push({
                                        resolve,
                                        reject,
                                        frameNumber: this.number,
                                    });
                                } else {
                                    if (frameDataCache[this.tid].nextChunkRequest) {
                                        for (const r of frameDataCache[this.tid].nextChunkRequest.callbacks) {
                                            r.reject(r.frameNumber);
                                        }
                                    }
                                    frameDataCache[this.tid].nextChunkRequest = {
                                        request: undefined,
                                        chunkNumber,
                                        start,
                                        stop,
                                        onDecodeAll,
                                        rejectRequestAll,
                                        completed: false,
                                        callbacks: [{
                                            resolve,
                                            reject,
                                            frameNumber: this.number,
                                        }],
                                    };
                                }
                            }
                        } else {
                            frameDataCache[this.tid].activeChunkRequest.callbacks.push({
                                resolve,
                                reject,
                                frameNumber: this.number,
                            });
                            provider.requestDecodeBlock(null, start, stop, onDecodeAll, rejectRequestAll);
                        }
                    } else {
                        if (this.number % chunkSize > 1 && !provider.isNextChunkExists(this.number) && decodedBlocksCacheSize > 1) {
                            const nextChunkNumber = chunkNumber + 1;
                            const nextStart = Math.max(this.startFrame, nextChunkNumber * chunkSize);
                            const nextStop = Math.min(this.stopFrame, (nextChunkNumber + 1) * chunkSize - 1);

                            if (nextStart < this.stopFrame) {
                                provider.setReadyToLoading(nextChunkNumber);
                                if (!provider.is_chunk_cached(nextStart, nextStop)){
                                    serverProxy.frames.getData(this.tid, nextChunkNumber).then(nextChunk =>{
                                        provider.requestDecodeBlock(nextChunk, nextStart, nextStop, undefined, undefined);
                                    }).catch(exception => {
                                        if (exception instanceof Exception) {
                                            reject(exception);
                                        } else {
                                            reject(new Exception(exception.message));
                                        }
                                    });
                                } else {
                                    provider.requestDecodeBlock(null, nextStart, nextStop, undefined, undefined);
                                }
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
        });
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

    async function getFrame(taskID, chunkSize, chunkType, mode, frame, startFrame, stopFrame) {
        const getFrameSize = (meta) => {
            let size = null;
            if (mode === 'interpolation') {
                [size] = meta;
            } else if (mode === 'annotation') {
                if (frame >= meta.length) {
                    throw new ArgumentError(
                        `Meta information about frame ${frame} can't be received from the server`,
                    );
                } else {
                    size = meta[frame];
                }
            } else {
                throw new ArgumentError(
                    `Invalid mode is specified ${mode}`,
                );
            }
            return size;
        };

        if (!(taskID in frameDataCache)) {
            const blockType = chunkType === 'video' ? cvatData.BlockType.MP4VIDEO
                : cvatData.BlockType.ARCHIVE;

            const meta = await serverProxy.frames.getMeta(taskID);
            // limit of decoded frames cache by 2GB for video (max height of video frame is 1080) and 500 frames for archive
            const decodedBlocksCacheSize = blockType === cvatData.BlockType.MP4VIDEO ?
                 Math.floor(2147483648 / 1920 / 1080 / 4 / chunkSize) || 1:
                 Math.floor(500 / chunkSize) || 1;

            frameDataCache[taskID] = {
                meta,
                chunkSize,
                provider: new cvatData.FrameProvider(blockType, chunkSize, 9, decodedBlocksCacheSize, 1),
                lastFrameRequest : frame,
                decodedBlocksCacheSize,
                activeChunkRequest: undefined,
                nextChunkRequest: undefined,
            };
        }

        const size = getFrameSize(frameDataCache[taskID].meta);
        frameDataCache[taskID].lastFrameRequest = frame;
        frameDataCache[taskID].provider.setRenderSize(size.width, size.height);
        return new FrameData(size.width, size.height, taskID, frame, startFrame, stopFrame);
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
