/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/


(() => {
    /**
        * Class representing statistics inside a session
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Statistics {
        constructor(label, total) {
            Object.defineProperties(this, Object.freeze({
                /**
                    * Statistics by labels which have a structure:
                    * @example
                    * {
                    *     label1: {
                    *         boxes: {
                    *             tracks: 10,
                    *             shapes: 11,
                    *         },
                    *         polygons: {
                    *             tracks: 12,
                    *             shapes: 13,
                    *         },
                    *         polylines: {
                    *             tracks: 14,
                    *             shapes: 15,
                    *         },
                    *         points: {
                    *             tracks: 16,
                    *             shapes: 17,
                    *         },
                    *         manually: 108,
                    *         interpolated: 500,
                    *         total: 608,
                    *     }
                    * }
                    * @name label
                    * @type {Object}
                    * @memberof module:API.cvat.classes.Statistics
                    * @readonly
                    * @instance
                */
                label: {
                    get: () => JSON.parse(JSON.stringify(label)),
                },
                /**
                    * Total statistics (summed by all labels) which have a structure:
                    * @example
                    * {
                    *     total: {
                    *         boxes: {
                    *             tracks: 10,
                    *             shapes: 11,
                    *         },
                    *         polygons: {
                    *             tracks: 12,
                    *             shapes: 13,
                    *         },
                    *         polylines: {
                    *             tracks: 14,
                    *             shapes: 15,
                    *         },
                    *         points: {
                    *             tracks: 16,
                    *             shapes: 17,
                    *         },
                    *         manually: 108,
                    *         interpolated: 500,
                    *         total: 608,
                    *     }
                    * }
                    * @name total
                    * @type {Object}
                    * @memberof module:API.cvat.classes.Statistics
                    * @readonly
                    * @instance
                */
                total: {
                    get: () => JSON.parse(JSON.stringify(total)),
                },
            }));
        }
    }

    module.exports = Statistics;
})();
