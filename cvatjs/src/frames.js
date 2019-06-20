/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const PluginRegistry = require('./plugins');

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
            * @method image
            * @returns {string}
            * @memberof module:API.cvat.classes.FrameData
            * @instance
            * @async
            * @throws {module:API.cvat.exception.ServerError}
            * @throws {module:API.cvat.exception.PluginError}
        */
        async image() {
            const result = await PluginRegistry
                .apiWrapper.call(this, FrameData.prototype.image);
            return result;
        }
    }

    module.exports = FrameData;
})();
