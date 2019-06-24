/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
    global:false
*/

(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');

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
            * @method frame
            * @returns {string}
            * @memberof module:API.cvat.classes.FrameData
            * @instance
            * @async
            * @throws {module:API.cvat.exception.ServerError}
            * @throws {module:API.cvat.exception.PluginError}
        */
        async frame() {
            const result = await PluginRegistry
                .apiWrapper.call(this, FrameData.prototype.frame);
            return result;
        }
    }

    FrameData.prototype.frame.implementation = async function () {
        if (!(this.number in frameCache[this.tid])) {
            const frame = await serverProxy.frames.getFrame(this.tid, this.number);

            if (window.URL.createObjectURL) { // browser env
                const url = window.URL.createObjectURL(new Blob([frame]));
                frameCache[this.tid][this.number] = url;
            } else {
                frameCache[this.tid][this.number] = global.Buffer.from(frame, 'binary').toString('base64');
            }
        }

        return frameCache[this.tid][this.number];
    };

    async function getFrame(taskID, mode, frame) {
        if (!(taskID in frameDataCache)) {
            frameDataCache[taskID] = {};
            frameDataCache[taskID].meta = await serverProxy.frames.getMeta(taskID);

            frameCache[taskID] = {};
        }

        if (!(frame in frameDataCache[taskID])) {
            let size = null;
            if (mode === 'interpolation') {
                [size] = frameDataCache[taskID].meta;
            } else if (mode === 'annotation') {
                if (frame >= frameDataCache[taskID].meta.length) {
                    throw new window.cvat.exceptions.ArgumentError(
                        `Meta information about frame ${frame} can't be received from the server`,
                    );
                } else {
                    size = frameDataCache[taskID].meta[frame];
                }
            } else {
                throw new window.cvat.exceptions.ArgumentError(
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
