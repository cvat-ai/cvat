/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const cvatData = require('../../cvat-data');
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const {
        Exception,
        ArgumentError,
        ScriptingError,
    } = require('./exceptions');

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
            try {
                const { provider } = frameDataCache[this.tid];
                let frame = provider.frame(this.number);
                if (frame === null) {
                    onServerRequest();
                    const { chunkSize } = frameDataCache[this.tid];
                    const start = parseInt(this.number / chunkSize, 10) * chunkSize;
                    const stop = (parseInt(this.number / chunkSize, 10) + 1) * chunkSize - 1;
                    const chunkNumber = Math.floor(this.number / chunkSize);
                    const chunk = await serverProxy.frames.getData(this.tid, chunkNumber);

                    await provider.decode(chunk, start, stop);
                    frame = provider.frame(this.number);
                }

                resolve(frame);
            } catch (exception) {
                if (exception instanceof Exception) {
                    reject(exception);
                } else {
                    reject(new ScriptingError(exception.message));
                }
            }
        }

        return new Promise(getFrameData.bind(this));
    };

    async function getFrame(taskID, chunkSize, mode, frame) {
        if (!(taskID in frameDataCache)) {
            const blockType = mode === 'interpolation' ? cvatData.BlockType.TSVIDEO
                : cvatData.BlockType.ARCHIVE;

            frameDataCache[taskID] = {};
            frameDataCache[taskID].meta = await serverProxy.frames.getMeta(taskID);
            frameDataCache[taskID].chunkSize = chunkSize;
            frameDataCache[taskID].provider = new cvatData.FrameProvider(3, blockType);

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
    };
})();
