/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/


(() => {
    /**
        * Class representing collection statistics
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Statistics {
        constructor(label, total) {
            Object.defineProperties(this, Object.freeze({
                /**
                    * Statistics by labels with a structure:
                    * @example
                    * {
                    *     label: {
                    *         boxes: {
                    *             tracks: 10,
                    *             shapes: 11,
                    *         },
                    *         polygons: {
                    *             tracks: 13,
                    *             shapes: 14,
                    *         },
                    *         polylines: {
                    *             tracks: 16,
                    *             shapes: 17,
                    *         },
                    *         points: {
                    *             tracks: 19,
                    *             shapes: 20,
                    *         },
                    *         tags: 66,
                    *         manually: 186,
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
                    * Total statistics (covers all labels) with a structure:
                    * @example
                    * {
                    *     boxes: {
                    *             tracks: 10,
                    *             shapes: 11,
                    *     },
                    *     polygons: {
                    *         tracks: 13,
                    *         shapes: 14,
                    *     },
                    *     polylines: {
                    *        tracks: 16,
                    *        shapes: 17,
                    *    },
                    *    points: {
                    *        tracks: 19,
                    *        shapes: 20,
                    *    },
                    *    tags: 66,
                    *    manually: 186,
                    *    interpolated: 500,
                    *    total: 608,
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
