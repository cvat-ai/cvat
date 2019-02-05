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

            canvasToClient: function(sourceCanvas, canvasBox) {
                let points = [
                    window.cvat.translate.point.canvasToClient(sourceCanvas, canvasBox.x, canvasBox.y),
                    window.cvat.translate.point.canvasToClient(sourceCanvas, canvasBox.x + canvasBox.width, canvasBox.y),
                    window.cvat.translate.point.canvasToClient(sourceCanvas, canvasBox.x, canvasBox.y + canvasBox.height),
                    window.cvat.translate.point.canvasToClient(sourceCanvas, canvasBox.x + canvasBox.width, canvasBox.y + canvasBox.height),
                ];

                let xes = points.map((el) => el.x);
                let yes = points.map((el) => el.y);

                let xmin = Math.min(...xes);
                let xmax = Math.max(...xes);
                let ymin = Math.min(...yes);
                let ymax = Math.max(...yes);

                return {
                    x: xmin,
                    y: ymin,
                    width: xmax - xmin,
                    height: ymax - ymin
                };
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
            _rotation: 0,
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
            },
            rotate(x, y, cx, cy) {
                cx = (typeof cx === "undefined" ? 0 : cx);
                cy = (typeof cy === "undefined" ? 0 : cy);

                let radians = (Math.PI / 180) * window.cvat.player.rotation;
                let cos = Math.cos(radians);
                let sin = Math.sin(radians);

                return {
                    x: (cos * (x - cx)) + (sin * (y - cy)) + cx,
                    y: (cos * (y - cy)) - (sin * (x - cx)) + cy
                }
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

    set rotation(value) {
        this._pointTranslator._rotation = value;
    }
}
