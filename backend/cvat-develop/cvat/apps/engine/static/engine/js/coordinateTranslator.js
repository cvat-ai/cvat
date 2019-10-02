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
                const canvasBox = {};
                for (const key in actualBox) {
                    canvasBox[key] = actualBox[key];
                }

                return this._convert(canvasBox, 1);
            },

            canvasToActual(canvasBox) {
                const actualBox = {};
                for (const key in canvasBox) {
                    actualBox[key] = canvasBox[key];
                }

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
            _convert(points, sign) {
                if (typeof (points) === 'string') {
                    return points.split(' ').map(coord => coord.split(',')
                        .map(x => +x + this._playerOffset * sign).join(',')).join(' ');
                }
                if (typeof (points) === 'object') {
                    return points.map(point => ({
                        x: point.x + this._playerOffset * sign,
                        y: point.y + this._playerOffset * sign,
                    }));
                }
                throw Error('Unknown points type was found');
            },
            actualToCanvas(actualPoints) {
                return this._convert(actualPoints, 1);
            },

            canvasToActual(canvasPoints) {
                return this._convert(canvasPoints, -1);
            },

            serverToClient(shape) {
                return {
                    points: shape.points.reduce((acc, el, idx) => {
                        if (idx % 2) {
                            acc.slice(-1)[0].push(el);
                        } else {
                            acc.push([el]);
                        }
                        return acc;
                    }, []).map(point => point.join(',')).join(' '),
                };
            },

            clientToServer(clientPoints) {
                return {
                    points: clientPoints.points.split(' ').join(',').split(',').map(x => +x),
                };
            },
        };

        this._pointTranslator = {
            _rotation: 0,
            clientToCanvas(targetCanvas, clientX, clientY) {
                let pt = targetCanvas.createSVGPoint();
                pt.x = clientX;
                pt.y = clientY;
                pt = pt.matrixTransform(targetCanvas.getScreenCTM().inverse());
                return pt;
            },
            canvasToClient(sourceCanvas, canvasX, canvasY) {
                let pt = sourceCanvas.createSVGPoint();
                pt.x = canvasX;
                pt.y = canvasY;
                pt = pt.matrixTransform(sourceCanvas.getScreenCTM());
                return pt;
            },
            rotate(x, y, cx, cy) {
                cx = (typeof cx === 'undefined' ? 0 : cx);
                cy = (typeof cy === 'undefined' ? 0 : cy);

                const radians = (Math.PI / 180) * window.cvat.player.rotation;
                const cos = Math.cos(radians);
                const sin = Math.sin(radians);

                return {
                    x: (cos * (x - cx)) + (sin * (y - cy)) + cx,
                    y: (cos * (y - cy)) - (sin * (x - cx)) + cy,
                };
            },
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
