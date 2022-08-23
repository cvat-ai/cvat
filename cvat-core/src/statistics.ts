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
                    * Statistics collected by labels, has the following structure:
                    * @example
                    * {
                    *     label: {
                    *         rectangle: {
                    *             track: 10,
                    *             shape: 11,
                    *         },
                    *         polygon: {
                    *             track: 13,
                    *             shape: 14,
                    *         },
                    *         polyline: {
                    *             track: 16,
                    *             shape: 17,
                    *         },
                    *         points: {
                    *             track: 19,
                    *             shape: 20,
                    *         },
                    *         ellipse: {
                    *             track: 13,
                    *             shape: 15,
                    *         },
                    *         cuboid: {
                    *             track: 21,
                    *             shape: 22,
                    *         },
                    *         skeleton: {
                    *             track: 21,
                    *             shape: 22,
                    *         },
                    *         tag: 66,
                    *         manually: 207,
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
                    * Total objects statistics (within all the labels), has the following structure:
                    * @example
                    * {
                    *    rectangle: {
                    *        tracks: 10,
                    *        shapes: 11,
                    *    },
                    *    polygon: {
                    *        tracks: 13,
                    *        shapes: 14,
                    *    },
                    *    polyline: {
                    *        tracks: 16,
                    *        shapes: 17,
                    *    },
                    *    point: {
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
                    *    skeleton: {
                    *        tracks: 21,
                    *        shapes: 22,
                    *    },
                    *    tag: 66,
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
