/*
 * Copyright (C) 2019 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported BorderSticker */

class BorderSticker {
    constructor(currentShape, frameContent, shapes, scale) {
        this._currentShape = currentShape;
        this._frameContent = frameContent;
        this._enabled = false;
        this._groups = null;
        this._scale = scale;
        this._accounter = {
            clicks: [],
            shapeID: null,
        };

        const transformedShapes = shapes
            .filter((shape) => !shape.model.removed)
            .map((shape) => {
                const pos = shape.interpolation.position;
                // convert boxes to point sets
                if (!('points' in pos)) {
                    return {
                        points: window.cvat.translate.points
                            .actualToCanvas(`${pos.xtl},${pos.ytl} ${pos.xbr},${pos.ytl}`
                                + ` ${pos.xbr},${pos.ybr} ${pos.xtl},${pos.ybr}`),
                        color: shape.model.color.shape,
                    };
                }

                return {
                    points: window.cvat.translate.points
                        .actualToCanvas(pos.points),
                    color: shape.model.color.shape,
                };
            });

        this._drawBorderMarkers(transformedShapes);
    }

    _addRawPoint(x, y) {
        this._currentShape.array().valueOf().pop();
        this._currentShape.array().valueOf().push([x, y]);
        // not error, specific of the library
        this._currentShape.array().valueOf().push([x, y]);
        const paintHandler = this._currentShape.remember('_paintHandler');
        paintHandler.drawCircles();
        paintHandler.set.members.forEach((el) => {
            el.attr('stroke-width', 1 / this._scale).attr('r', 2.5 / this._scale);
        });
        this._currentShape.plot(this._currentShape.array().valueOf());
    }

    _drawBorderMarkers(shapes) {
        const namespace = 'http://www.w3.org/2000/svg';

        this._groups = shapes.reduce((acc, shape, shapeID) => {
            // Group all points by inside svg groups
            const group = window.document.createElementNS(namespace, 'g');
            shape.points.split(/\s/).map((point, pointID, points) => {
                const [x, y] = point.split(',').map((coordinate) => +coordinate);
                const circle = window.document.createElementNS(namespace, 'circle');
                circle.classList.add('shape-creator-border-point');
                circle.setAttribute('fill', shape.color);
                circle.setAttribute('stroke', 'black');
                circle.setAttribute('stroke-width', 1 / this._scale);
                circle.setAttribute('cx', +x);
                circle.setAttribute('cy', +y);
                circle.setAttribute('r', 5 / this._scale);

                circle.doubleClickListener = (e) => {
                    // Just for convenience (prevent screen fit feature)
                    e.stopPropagation();
                };

                circle.clickListener = (e) => {
                    e.stopPropagation();
                    // another shape was clicked
                    if (this._accounter.shapeID !== null && this._accounter.shapeID !== shapeID) {
                        this.reset();
                    }

                    this._accounter.shapeID = shapeID;

                    if (this._accounter.clicks[1] === pointID) {
                        // the same point repeated two times
                        const [_x, _y] = point.split(',').map((coordinate) => +coordinate);
                        this._addRawPoint(_x, _y);
                        this.reset();
                        return;
                    }

                    // the first point can not be clicked twice
                    if (this._accounter.clicks[0] !== pointID) {
                        this._accounter.clicks.push(pointID);
                    } else {
                        return;
                    }

                    // up clicked group for convenience
                    this._frameContent.node.appendChild(group);

                    // the first click
                    if (this._accounter.clicks.length === 1) {
                        // draw and remove initial point just to initialize data structures
                        if (!this._currentShape.remember('_paintHandler').startPoint) {
                            this._currentShape.draw('point', e);
                            this._currentShape.draw('undo');
                        }

                        const [_x, _y] = point.split(',').map((coordinate) => +coordinate);
                        this._addRawPoint(_x, _y);
                    // the second click
                    } else if (this._accounter.clicks.length === 2) {
                        circle.classList.add('shape-creator-border-point-direction');
                    // the third click
                    } else {
                        // sign defines bypass direction
                        const landmarks = this._accounter.clicks;
                        const sign = Math.sign(landmarks[2] - landmarks[0])
                            * Math.sign(landmarks[1] - landmarks[0])
                            * Math.sign(landmarks[2] - landmarks[1]);

                        // go via a polygon and get vertexes
                        // the first vertex has been already drawn
                        const way = [];
                        for (let i = landmarks[0] + sign; ; i += sign) {
                            if (i < 0) {
                                i = points.length - 1;
                            } else if (i === points.length) {
                                i = 0;
                            }

                            way.push(points[i]);

                            if (i === this._accounter.clicks[this._accounter.clicks.length - 1]) {
                                // put the last element twice
                                // specific of svg.draw.js
                                // way.push(points[i]);
                                break;
                            }
                        }

                        // remove the latest cursor position from drawing array
                        for (const wayPoint of way) {
                            const [_x, _y] = wayPoint.split(',').map((coordinate) => +coordinate);
                            this._addRawPoint(_x, _y);
                        }

                        this.reset();
                    }
                };

                circle.addEventListener('click', circle.clickListener);
                circle.addEventListener('dblclick', circle.doubleClickListener);

                return circle;
            }).forEach((circle) => group.appendChild(circle));

            acc.push(group);
            return acc;
        }, []);

        this._groups
            .forEach((group) => this._frameContent.node.appendChild(group));
    }

    reset() {
        if (this._accounter.shapeID !== null) {
            while (this._accounter.clicks.length > 0) {
                const resetID = this._accounter.clicks.pop();
                this._groups[this._accounter.shapeID]
                    .children[resetID].classList.remove('shape-creator-border-point-direction');
            }
        }

        this._accounter = {
            clicks: [],
            shapeID: null,
        };
    }

    disable() {
        if (this._groups) {
            this._groups.forEach((group) => {
                Array.from(group.children).forEach((circle) => {
                    circle.removeEventListener('click', circle.clickListener);
                    circle.removeEventListener('dblclick', circle.doubleClickListener);
                });

                group.remove();
            });

            this._groups = null;
        }
    }

    scale(scale) {
        this._scale = scale;
        if (this._groups) {
            this._groups.forEach((group) => {
                Array.from(group.children).forEach((circle) => {
                    circle.setAttribute('r', 5 / scale);
                    circle.setAttribute('stroke-width', 1 / scale);
                });
            });
        }
    }
}
