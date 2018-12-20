/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported CoordinateTranslator */
"use strict";

class CoordinateTranslator {
    constructor() {
        this._boxTranslator = {
            _playerOffset: 0,
            _convert: function(box, sign) {
                for (let prop of ["xtl", "ytl", "xbr", "ybr", "x", "y"]) {
                    if (prop in box) {
                        box[prop] += this._playerOffset * sign;
                    }
                }

                return box;
            },
            actualToCanvas: function(actualBox) {
                let canvasBox = {};
                for (let key in actualBox) {
                    canvasBox[key] = actualBox[key];
                }

                return this._convert(canvasBox, 1);
            },

            canvasToActual: function(canvasBox) {
                let actualBox = {};
                for (let key in canvasBox) {
                    actualBox[key] = canvasBox[key];
                }

                return this._convert(actualBox, -1);
            },
        };

        this._pointsTranslator = {
            _playerOffset: 0,
            _convert: function(points, sign) {
                if (typeof(points) === 'string') {
                    return points.split(' ').map((coord) => coord.split(',')
                        .map((x) => +x + this._playerOffset * sign).join(',')).join(' ');
                }
                else if (typeof(points) === 'object') {
                    let result = [];
                    for (let point of points) {
                        result.push({
                            x: point.x + this._playerOffset * sign,
                            y: point.y + this._playerOffset * sign,
                        });
                    }
                    return result;
                }
                else {
                    throw Error('Unknown points type was found');
                }
            },
            actualToCanvas: function(actualPoints) {
                return this._convert(actualPoints, 1);
            },

            canvasToActual: function(canvasPoints) {
                return this._convert(canvasPoints, -1);
            }
        },

        this._pointTranslator = {
            clientToCanvas: function(targetCanvas, clientX, clientY) {
                let pt = targetCanvas.createSVGPoint();
                pt.x = clientX;
                pt.y = clientY;
                pt = pt.matrixTransform(targetCanvas.getScreenCTM().inverse());
                return pt;
            },
            canvasToClient: function(sourceCanvas, canvasX, canvasY) {
                let pt = sourceCanvas.createSVGPoint();
                pt.x = canvasX;
                pt.y = canvasY;
                pt = pt.matrixTransform(sourceCanvas.getScreenCTM());
                return pt;
            }
        };
    }

    get box() {
        return this._boxTranslator;
    }

    get points() {
        return this._pointsTranslator;
    }

    get point() {
        return this._pointTranslator;
    }

    set playerOffset(value) {
        this._boxTranslator._playerOffset = value;
        this._pointsTranslator._playerOffset = value;
    }
}
