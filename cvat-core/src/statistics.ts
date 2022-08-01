// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    /**
     * Class representing collection statistics
     * @memberof module:API.cvat.classes
     * @hideconstructor
     */
    class Statistics {
        constructor(label, total) {
            Object.defineProperties(
                this,
                Object.freeze({
                    /**
                    * Statistics by labels with a structure:
                    * @example
                    * {
                    *     label: {
                    *         box: {
                    *             tracks: 10,
                    *             shapes: 11,
                    *         },
                    *         polygon: {
                    *             tracks: 13,
                    *             shapes: 14,
                    *         },
                    *         polyline: {
                    *             tracks: 16,
                    *             shapes: 17,
                    *         },
                    *         points: {
                    *             tracks: 19,
                    *             shapes: 20,
                    *         },
                    *         ellipse: {
                    *             tracks: 13,
                    *             shapes: 15,
                    *         },
                    *         cuboid: {
                    *             tracks: 21,
                    *             shapes: 22,
                    *         },
                    *         mask: {
                    *             shapes: 22,
                    *         },
                    *         tags: 66,
                    *         manually: 208,
                    *         interpolated: 500,
                    *         total: 630,
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
                    *     box: {
                    *         tracks: 10,
                    *         shapes: 11,
                    *     },
                    *     polygon: {
                    *         tracks: 13,
                    *         shapes: 14,
                    *     },
                    *     polyline: {
                    *        tracks: 16,
                    *        shapes: 17,
                    *    },
                    *    points: {
                    *        tracks: 19,
                    *        shapes: 20,
                    *    },
                    *    ellipse: {
                    *        tracks: 13,
                    *        shapes: 15,
                    *    },
                    *    cuboid: {
                    *        tracks: 21,
                    *        shapes: 22,
                    *    },
                    *    mask: {
                    *         shapes: 22,
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
                }),
            );
        }
    }

    module.exports = Statistics;
})();
