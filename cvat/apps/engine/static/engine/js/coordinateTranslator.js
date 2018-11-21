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
            actualToCanvas: function(actualBox) {
                let canvasBox = {};
                for (let key in actualBox) {
                    canvasBox[key] = actualBox[key];
                }

                if ("xtl" in canvasBox) {
                    canvasBox.xtl += this._playerOffset;
                }

                if ("ytl" in canvasBox) {
                    canvasBox.ytl += this._playerOffset;
                }

                if ("xbr" in canvasBox) {
                    canvasBox.xbr += this._playerOffset;
                }

                if ("ybr" in canvasBox) {
                    canvasBox.ybr += this._playerOffset;
                }

                if ("x" in canvasBox) {
                    canvasBox.x += this._playerOffset;
                }

                if ("y" in canvasBox) {
                    canvasBox.y += this._playerOffset;
                }

                return canvasBox;
            },

            canvasToActual: function(canvasBox) {
                let actualBox = {};
                for (let key in canvasBox) {
                    actualBox[key] = canvasBox[key];
                }

                if ("xtl" in actualBox) {
                    actualBox.xtl -= this._playerOffset;
                }

                if ("ytl" in actualBox) {
                    actualBox.ytl -= this._playerOffset;
                }

                if ("xbr" in actualBox) {
                    actualBox.xbr -= this._playerOffset;
                }

                if ("ybr" in actualBox) {
                    actualBox.ybr -= this._playerOffset;
                }

                if ("x" in actualBox) {
                    actualBox.x -= this._playerOffset;
                }

                if ("y" in actualBox) {
                    actualBox.y -= this._playerOffset;
                }

                return actualBox;
            },
        }

        this._pointsTranslator = {
            _playerOffset: 0,
            actualToCanvas: function(actualPoints) {
                if (typeof(actualPoints) === 'string') {
                    return actualPoints.split(' ').map((coord) => coord.split(',')
                        .map((x) => +x + this._playerOffset).join(',')).join(' ');
                }
                else if (typeof(actualPoints) === 'object') {
                    let canvasPoints = [];
                    for (let point of actualPoints) {
                        canvasPoints.push({
                            x: point.x + this._playerOffset,
                            y: point.y + this._playerOffset,
                        });
                    }
                    return canvasPoints;
                }
                else {
                    throw Error('Unknown points type was found');
                }
            },

            canvasToActual: function(canvasPoints) {
                if (typeof(canvasPoints) === 'string') {
                    return canvasPoints.split(' ').map((coord) => coord.split(',')
                        .map((x) => +x - this._playerOffset).join(',')).join(' ');
                }
                else if (typeof(canvasPoints) === 'object') {
                    let actualPoints = [];
                    for (let point of canvasPoints) {
                        actualPoints.push({
                            x: point.x - this._playerOffset,
                            y: point.y - this._playerOffset,
                        });
                    }
                    return actualPoints;
                }
                else {
                    throw Error('Unknown points type was found');
                }
            }
        },

        this._pointTranslator = {
            clientToCanvas: function(targetCanvas, clientX, clientY) {
                let pt = targetCanvas.createSVGPoint();
                pt.x = clientX;
                pt.y = clientY;
                pt = pt.matrixTransform(targetCanvas.getScreenCTM().inverse());
                return pt;
            }
        }
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
