/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
    global:false
*/

(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const { ArgumentError } = require('./exceptions');
    const { isBrowser, isNode } = require('browser-or-node');

    // This is the frames storage
    const frameDataCache = {};
    const frameCache = {};

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
                /**
                    * @name number
                    * @type {integer}
                    * @memberof module:API.cvat.classes.FrameData
                    * @readonly
                    * @instance
                */
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
        return new Promise(async (resolve, reject) => {
            try {
                if (this.number in frameCache[this.tid]) {
                    resolve(frameCache[this.tid][this.number]);
                } else {
                    onServerRequest();
                    const frame = await serverProxy.frames.getData(this.tid, this.number);

                    if (isNode) {
                        frameCache[this.tid][this.number] = global.Buffer.from(frame, 'binary').toString('base64');
                        resolve(frameCache[this.tid][this.number]);
                    } else if (isBrowser) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const image = new Image(frame.width, frame.height);
                            image.onload = () => {
                                frameCache[this.tid][this.number] = image;
                                resolve(frameCache[this.tid][this.number]);
                            };
                            image.src = reader.result;
                        };

                        reader.readAsDataURL(frame);
                    }
                }
            } catch (exception) {
                reject(exception);
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

    async function getFrame(taskID, mode, frame) {
        if (!(taskID in frameDataCache)) {
            frameDataCache[taskID] = {
                meta: await serverProxy.frames.getMeta(taskID),
            };

            frameCache[taskID] = {};
        }

        if (!(frame in frameDataCache[taskID])) {
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

            frameDataCache[taskID][frame] = new FrameData(size.width, size.height, taskID, frame);
        }

        return frameDataCache[taskID][frame];
    }

    module.exports = {
        FrameData,
        getFrame,
        getPreview,
    };
})();
