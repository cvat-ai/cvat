/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const serverProxy = require('./server-proxy');

    /**
        * Class provides meta information about specific frame and frame itself
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class FrameData {
        constructor(width, height, tid, number) {
            let frame = null;

            Object.defineProperties(this, {
                /**
                    * @name width
                    * @type {integer}
                    * @memberof module:API.cvat.classes.FrameData
                    * @readonly
                    * @instance
                */
                width: {
                    get: () => width,
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
                    get: () => height,
                    writable: false,
                },
                /**
                    * Method returns URL encoded image which can be placed in the <img> tag
                    * @method image
                    * @memberof module:API.cvat.classes.FrameData
                    * @instance
                    * @async
                    * @throws {module:API.cvat.exception.ServerError}
                    * @returns {string}
                */
                image: {
                    value: async () => {
                        if (!frame) {
                            frame = await serverProxy.frames.getFrame(tid, number);
                        }
                        return frame;
                    },
                    writable: false,
                },
            });
        }
    }

    module.exports = FrameData;
})();
