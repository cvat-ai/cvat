/*
 * Copyright (C) 2019 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported BorderSticker */

class BorderSticker {
    constructor(drawInstance, frameContent, shapes, scale) {
        this._drawInstance = drawInstance;
        this._frameContent = frameContent;
        this._shapes = this._formatShapes(shapes);
        this._enabled = false;
        this._groups = null;
        this._scale = scale;

        this._drawBorderMarkers();
    }

    _formatShapes(shapes) {
        return shapes
            .filter((shape) => !shape.model.removed)
            .map((shape) => {
                const pos = shape.interpolation.position;
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
    }

    _rescaleDrawPoints() {
        if (this._drawInstance) {
            this._drawInstance.remember('_paintHandler').set.members.forEach((el) => {
                el.attr('stroke-width', 1 / this._scale).attr('r', 2.5 / this._scale);
            });
        }
    }

    _removeBorderMarkers() {
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

    _drawBorderMarkers() {
        this._accounter = {
            clicks: [],
            shapeID: null,
        };

        const namespace = 'http://www.w3.org/2000/svg';
        const groups = this._shapes.reduce((acc, shape, shapeID, shapes) => {
            const group = window.document.createElementNS(namespace, 'g');
            shape.points.split(/\s/)
                .map((point, pointID, points) => {
                    const [x, y] = point.split(',');
                    const circle = window.document.createElementNS(namespace, 'circle');
                    circle.classList.add('shape-creator-border-point');
                    circle.setAttribute('fill', shape.color);
                    circle.setAttribute('stroke', 'black');
                    circle.setAttribute('stroke-width', 1 / this._scale);
                    circle.setAttribute('cx', +x);
                    circle.setAttribute('cy', +y);
                    circle.setAttribute('r', 5 / this._scale);
                    circle.doubleClickListener = (e) => {
                        e.stopPropagation();
                    };
                    circle.clickListener = (e) => {
                        e.stopPropagation();
                        if (this._accounter.shapeID !== null && this._accounter.shapeID !== shapeID) {
                            if (this._accounter.clicks.length === 2) {
                                const pointToAdd = shapes[this._accounter.shapeID].points.split(/\s/)[this._accounter.clicks[1]];
                                const [_x, _y] = pointToAdd.split(',');
                                this._drawInstance.array().valueOf().pop();
                                this._drawInstance.array().valueOf().push([+_x, +_y]);
                                this._drawInstance.array().valueOf().push([+_x, +_y]);
                                this._drawInstance.remember('_paintHandler').drawCircles();
                                this._drawInstance.plot(this._drawInstance.array().valueOf());
                                this._rescaleDrawPoints();
                            }

                            while (this._accounter.clicks.length > 0) {
                                const resetID = this._accounter.clicks.pop();
                                groups[this._accounter.shapeID]
                                    .children[resetID].classList.remove('shape-creator-border-point-direction');
                            }
                        }

                        this._accounter.shapeID = shapeID;

                        this._accounter.clicks.push(pointID);

                        // up current group to work with its points easy
                        this._frameContent.node.appendChild(group);
                        if (this._accounter.clicks.length === 1) {
                            if (!this._drawInstance.remember('_paintHandler').startPoint) {
                                this._drawInstance.draw('point', e);
                                this._drawInstance.array().valueOf().pop();
                            }

                            this._drawInstance.array().valueOf().pop();
                            const borderPoint = points[pointID];
                            const [_x, _y] = borderPoint.split(',');
                            this._drawInstance.array().valueOf().push([+_x, +_y]);
                            this._drawInstance.array().valueOf().push([+_x, +_y]);

                            this._drawInstance.remember('_paintHandler').drawCircles();
                            this._drawInstance.plot(this._drawInstance.array().valueOf());
                            this._rescaleDrawPoints();
                        } else if (this._accounter.clicks.length === 2) {
                            circle.classList.add('shape-creator-border-point-direction');
                        } else {
                            if (this._accounter.clicks[1] === this._accounter.clicks[2]) {
                                this._drawInstance.array().valueOf().pop();
                                const borderPoint = points[this._accounter.clicks[2]];
                                const [_x, _y] = borderPoint.split(',');
                                this._drawInstance.array().valueOf().push([+_x, +_y]);
                                this._drawInstance.array().valueOf().push([+_x, +_y]);
                                this._drawInstance.remember('_paintHandler').drawCircles();
                                this._drawInstance.plot(this._drawInstance.array().valueOf());
                                this._rescaleDrawPoints();

                                while (this._accounter.clicks.length > 0) {
                                    const resetID = this._accounter.clicks.pop();
                                    group.children[resetID].classList.remove('shape-creator-border-point-direction');
                                }

                                this._accounter.shapeID = null;

                                return;
                            }

                            const s = Math.sign(this._accounter.clicks[2] - this._accounter.clicks[0])
                                * Math.sign(this._accounter.clicks[1] - this._accounter.clicks[0])
                                * Math.sign(this._accounter.clicks[2] - this._accounter.clicks[1]);

                            const border = [];
                            for (let i = this._accounter.clicks[0]; ; i += s) {
                                if (i < 0) {
                                    i = points.length - 1;
                                } else if (i === points.length) {
                                    i = 0;
                                }

                                border.push(points[i]);

                                if (i === this._accounter.clicks[this._accounter.clicks.length - 1]) {
                                    // put the last element twice
                                    // specific of svg.draw.js
                                    border.push(points[i]);
                                    break;
                                }
                            }

                            // remove the latest cursor position from drawing array
                            this._drawInstance.array().valueOf().pop();
                            for (const borderPoint of border.slice(1)) {
                                const [_x, _y] = borderPoint.split(',');
                                this._drawInstance.array().valueOf().push([+_x, +_y]);
                            }

                            this._drawInstance.remember('_paintHandler').drawCircles();
                            this._drawInstance.plot(this._drawInstance.array().valueOf());
                            this._rescaleDrawPoints();

                            while (this._accounter.clicks.length > 0) {
                                const resetID = this._accounter.clicks.pop();
                                group.children[resetID].classList.remove('shape-creator-border-point-direction');
                            }

                            this._accounter.shapeID = null;
                        }
                    };

                    circle.addEventListener('click', circle.clickListener);
                    circle.addEventListener('dblclick', circle.doubleClickListener);

                    return circle;
                }).forEach((circle) => group.appendChild(circle));
            acc.push(group);
            return acc;
        }, []);

        this._groups = groups;
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
        this._removeBorderMarkers();
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
