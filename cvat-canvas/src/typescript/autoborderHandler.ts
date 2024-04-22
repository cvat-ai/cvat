// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';

import consts from './consts';
import { Configuration, Geometry } from './canvasModel';

interface TransformedShape {
    points: string;
    color: string;
}

export interface AutoborderHandler {
    autoborder(enabled: boolean, currentShape?: SVG.Shape, currentID?: number): void;
    configurate(configuration: Configuration): void;
    transform(geometry: Geometry): void;
    updateObjects(): void;
}

export class AutoborderHandlerImpl implements AutoborderHandler {
    private currentShape: SVG.Shape | null;
    private currentID?: number;
    private frameContent: SVGSVGElement;
    private enabled: boolean;
    private scale: number;
    private controlPointsSize: number;
    private groups: SVGGElement[];
    private auxiliaryGroupID: number | null;
    private auxiliaryClicks: number[];
    private listeners: Record<number, Record<number, {
        click: (event: MouseEvent) => void;
        dblclick: (event: MouseEvent) => void;
    }>>;

    public constructor(frameContent: SVGSVGElement) {
        this.frameContent = frameContent;
        this.currentID = undefined;
        this.currentShape = null;
        this.enabled = false;
        this.scale = 1;
        this.groups = [];
        this.controlPointsSize = consts.BASE_POINT_SIZE;
        this.auxiliaryGroupID = null;
        this.auxiliaryClicks = [];
        this.listeners = {};
    }

    private removeMarkers(): void {
        this.groups.forEach((group: SVGGElement): void => {
            const groupID = group.dataset.groupId;
            Array.from(group.children).forEach((circle: SVGCircleElement, pointID: number): void => {
                circle.removeEventListener('click', this.listeners[+groupID][pointID].click);
                circle.removeEventListener('dblclick', this.listeners[+groupID][pointID].click);
                circle.remove();
            });

            group.remove();
        });

        this.groups = [];
        this.auxiliaryGroupID = null;
        this.auxiliaryClicks = [];
        this.listeners = {};
    }

    private release(): void {
        this.removeMarkers();
        this.enabled = false;
        this.currentShape = null;
    }

    private addPointToCurrentShape(x: number, y: number): void {
        const array: number[][] = (this.currentShape as any).array().valueOf();
        array.pop();

        // need to append twice (specific of the library)
        array.push([x, y]);
        array.push([x, y]);

        const paintHandler = this.currentShape.remember('_paintHandler');
        paintHandler.drawCircles();
        paintHandler.set.members.forEach((el: SVG.Circle): void => {
            el.attr('stroke-width', 1 / this.scale).attr('r', 2.5 / this.scale);
        });
        (this.currentShape as any).plot(array);
    }

    private resetAuxiliaryShape(): void {
        if (this.auxiliaryGroupID !== null) {
            while (this.auxiliaryClicks.length > 0) {
                const resetID = this.auxiliaryClicks.pop();
                this.groups[this.auxiliaryGroupID].children[resetID].classList.remove(
                    'cvat_canvas_autoborder_point_direction',
                );
            }
        }

        this.auxiliaryClicks = [];
        this.auxiliaryGroupID = null;
    }

    // convert each shape to group of clicable points
    // save all groups
    private drawMarkers(transformedShapes: TransformedShape[]): void {
        const svgNamespace = 'http://www.w3.org/2000/svg';

        this.groups = transformedShapes.map(
            (shape: TransformedShape, groupID: number): SVGGElement => {
                const group = document.createElementNS(svgNamespace, 'g');
                group.setAttribute('data-group-id', `${groupID}`);

                this.listeners[groupID] = this.listeners[groupID] || {};
                const circles = shape.points.split(/\s/).map(
                    (point: string, pointID: number, points: string[]): SVGCircleElement => {
                        const [x, y] = point.split(',');

                        const circle = document.createElementNS(svgNamespace, 'circle');
                        circle.classList.add('cvat_canvas_autoborder_point');
                        circle.setAttribute('fill', shape.color);
                        circle.setAttribute('stroke', 'black');
                        circle.setAttribute('stroke-width', `${consts.POINTS_STROKE_WIDTH / this.scale}`);
                        circle.setAttribute('cx', x);
                        circle.setAttribute('cy', y);
                        circle.setAttribute('r', `${this.controlPointsSize / this.scale}`);

                        const click = (event: MouseEvent): void => {
                            event.stopPropagation();

                            // another shape was clicked
                            if (this.auxiliaryGroupID !== null && this.auxiliaryGroupID !== groupID) {
                                this.resetAuxiliaryShape();
                            }

                            this.auxiliaryGroupID = groupID;
                            // up clicked group for convenience
                            this.frameContent.appendChild(group);

                            if (this.auxiliaryClicks[1] === pointID) {
                                // the second point was clicked twice
                                this.addPointToCurrentShape(+x, +y);
                                this.resetAuxiliaryShape();
                                return;
                            }

                            // the first point can not be clicked twice
                            // just ignore such a click if it is
                            if (this.auxiliaryClicks[0] !== pointID) {
                                this.auxiliaryClicks.push(pointID);
                            } else {
                                return;
                            }

                            // it is the first click
                            if (this.auxiliaryClicks.length === 1) {
                                const handler = this.currentShape.remember('_paintHandler');
                                // draw and remove initial point just to initialize data structures
                                if (!handler || !handler.startPoint) {
                                    (this.currentShape as any).draw('point', event);
                                    (this.currentShape as any).draw('undo');
                                }

                                this.addPointToCurrentShape(+x, +y);
                                // is is the second click
                            } else if (this.auxiliaryClicks.length === 2) {
                                circle.classList.add('cvat_canvas_autoborder_point_direction');
                                // it is the third click
                            } else {
                                // sign defines bypass direction
                                const landmarks = this.auxiliaryClicks;
                                const sign = Math.sign(landmarks[2] - landmarks[0]) *
                                    Math.sign(landmarks[1] - landmarks[0]) *
                                    Math.sign(landmarks[2] - landmarks[1]);

                                // go via a polygon and get vertices
                                // the first vertex has been already drawn
                                const way = [];
                                for (let i = landmarks[0] + sign; ; i += sign) {
                                    if (i < 0) {
                                        i = points.length - 1;
                                    } else if (i === points.length) {
                                        i = 0;
                                    }

                                    way.push(points[i]);

                                    if (i === this.auxiliaryClicks[this.auxiliaryClicks.length - 1]) {
                                        // put the last element twice
                                        // specific of svg.draw.js
                                        // way.push(points[i]);
                                        break;
                                    }
                                }

                                // remove the latest cursor position from drawing array
                                for (const wayPoint of way) {
                                    const [pX, pY] = wayPoint
                                        .split(',')
                                        .map((coordinate: string): number => +coordinate);
                                    this.addPointToCurrentShape(pX, pY);
                                }

                                this.resetAuxiliaryShape();
                            }
                        };

                        const dblclick = (event: MouseEvent): void => {
                            event.stopPropagation();
                        };

                        this.listeners[groupID][pointID] = {
                            click,
                            dblclick,
                        };

                        circle.addEventListener('mousedown', this.listeners[groupID][pointID].click);
                        circle.addEventListener('dblclick', this.listeners[groupID][pointID].click);
                        return circle;
                    },
                );

                group.append(...circles);
                return group;
            },
        );

        this.frameContent.append(...this.groups);
    }

    public updateObjects(): void {
        if (!this.enabled) return;
        this.removeMarkers();

        const currentClientID = this.currentShape.node.dataset.originClientId;
        const shapes = Array.from(this.frameContent.getElementsByClassName('cvat_canvas_shape')).filter(
            (shape: HTMLElement): boolean => +shape.getAttribute('clientID') !== this.currentID &&
                !shape.classList.contains('cvat_canvas_hidden'),
        );
        const transformedShapes = shapes
            .map((shape: HTMLElement): TransformedShape | null => {
                const color = shape.getAttribute('fill');
                const clientID = shape.getAttribute('clientID');

                if (color === null || clientID === null) return null;
                if (+clientID === +currentClientID) {
                    return null;
                }

                let points = '';
                if (shape.tagName === 'polyline' || shape.tagName === 'polygon') {
                    points = shape.getAttribute('points');
                } else if (shape.tagName === 'ellipse') {
                    const cx = +shape.getAttribute('cx');
                    const cy = +shape.getAttribute('cy');
                    points = `${cx},${cy}`;
                } else if (shape.tagName === 'rect') {
                    const x = +shape.getAttribute('x');
                    const y = +shape.getAttribute('y');
                    const width = +shape.getAttribute('width');
                    const height = +shape.getAttribute('height');

                    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(x) || Number.isNaN(x)) {
                        return null;
                    }

                    points = `${x},${y} ${x + width},${y} ${x + width},${y + height} ${x},${y + height}`;
                } else if (shape.tagName === 'g') {
                    const polylineID = shape.dataset.polylineId;
                    const polyline = this.frameContent.getElementById(polylineID);
                    if (polyline && polyline.getAttribute('points')) {
                        points = polyline.getAttribute('points');
                    } else {
                        return null;
                    }
                }

                return {
                    color,
                    points: points.trim(),
                };
            })
            .filter((state: TransformedShape | null): boolean => state !== null);

        this.drawMarkers(transformedShapes);
    }

    public autoborder(enabled: boolean, currentShape?: SVG.Shape, currentID?: number): void {
        if (enabled && !this.enabled && currentShape) {
            this.enabled = true;
            this.currentShape = currentShape;
            this.currentID = currentID;
            this.updateObjects();
        } else {
            this.release();
        }
    }

    public transform(geometry: Geometry): void {
        this.scale = geometry.scale;
        this.groups.forEach((group: SVGGElement): void => {
            Array.from(group.children).forEach((circle: SVGCircleElement): void => {
                circle.setAttribute('r', `${this.controlPointsSize / this.scale}`);
                circle.setAttribute('stroke-width', `${consts.BASE_STROKE_WIDTH / this.scale}`);
            });
        });
    }

    public configurate(configuration: Configuration): void {
        this.controlPointsSize = configuration.controlPointsSize || consts.BASE_POINT_SIZE;
    }
}
