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
            _convert(box, sign) {
                for (const prop of ['xtl', 'ytl', 'xbr', 'ybr', 'x', 'y']) {
                    if (prop in box) {
                        box[prop] += this._playerOffset * sign;
                    }
                }

                return box;
            },
            actualToCanvas(actualBox) {
                return this._convert({ ...actualBox }, 1);
            },
            canvasToActual(canvasBox) {
                const actualBox = {
                    x: canvasBox.x,
                    y: canvasBox.y,
                    height: canvasBox.height,
                    width: canvasBox.width,
                };

                return this._convert(actualBox, -1);
            },

            canvasToClient(sourceCanvas, canvasBox) {
                const points = [
                    [canvasBox.x, canvasBox.y],
                    [canvasBox.x + canvasBox.width, canvasBox.y],
                    [canvasBox.x, canvasBox.y + canvasBox.height],
                    [canvasBox.x + canvasBox.width, canvasBox.y + canvasBox.height],
                ].map(el => window.cvat.translate.point.canvasToClient(sourceCanvas, ...el));

                const xes = points.map(el => el.x);
                const yes = points.map(el => el.y);

                const xmin = Math.min(...xes);
                const xmax = Math.max(...xes);
                const ymin = Math.min(...yes);
                const ymax = Math.max(...yes);

                return {
                    x: xmin,
                    y: ymin,
                    width: xmax - xmin,
                    height: ymax - ymin,
                };
            },

            serverToClient(shape) {
                return {
                    xtl: shape.points[0],
                    ytl: shape.points[1],
                    xbr: shape.points[2],
                    ybr: shape.points[3],
                };
            },

            clientToServer(clientObject) {
                return {
                    points: [clientObject.xtl, clientObject.ytl,
                        clientObject.xbr, clientObject.ybr],
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
            },

            serverToClient: function(shape) {
                return {
                    points: shape.points.reduce((acc, el, idx) => {
                        idx % 2 ? acc.slice(-1)[0].push(el) : acc.push([el]);
                        return acc
                    }, []).map((point) => point.join(',')).join(' '),
                }
            },

            clientToServer: function(clientPoints) {
                return {
                    points: clientPoints.points.split(' ').join(',').split(',').map((x) => +x),
                };
            },
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
