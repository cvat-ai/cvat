/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import * as SVG from 'svg.js';
import consts from './consts';
import 'svg.draw.js';
import './svg.patch';

import {
    DrawData,
    Geometry,
} from './canvasModel';

import {
    translateToSVG,
    translateFromSVG,
} from './shared';

export interface DrawHandler {
    draw(drawData: DrawData, geometry: Geometry): void;
}

export class DrawHandlerImpl implements DrawHandler {
    // callback is used to notify about creating new shape
    private onDrawDone: (data: object) => void;
    private canvas: SVG.Container;
    private background: SVGSVGElement;
    private crosshair: {
        x: SVG.Line;
        y: SVG.Line;
    };
    private drawData: DrawData;
    private geometry: Geometry;
    private drawInstance: any;


    private addCrosshair(): void {
        this.crosshair = {
            x: this.canvas.line(0, 0, this.canvas.node.clientWidth, 0).attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * this.geometry.scale),
                zOrder: Number.MAX_SAFE_INTEGER,
            }).addClass('cvat_canvas_crosshair'),
            y: this.canvas.line(0, 0, 0, this.canvas.node.clientHeight).attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * this.geometry.scale),
                zOrder: Number.MAX_SAFE_INTEGER,
            }).addClass('cvat_canvas_crosshair'),
        };
    }

    private removeCrosshair(): void {
        this.crosshair.x.remove();
        this.crosshair.y.remove();
        this.crosshair = null;
    }

    private initDrawing(): void {
        if (this.drawData.crosshair) {
            this.addCrosshair();
        }
    }

    private closeDrawing(): void {
        if (this.crosshair) {
            this.removeCrosshair();
        }

        if (this.drawInstance) {
            if (this.drawData.shapeType === 'rectangle') {
                this.drawInstance.draw('cancel');
            } else {
                this.drawInstance.draw('done');
            }

            // We should check again because state can be changed in 'cancel' and 'done'
            if (this.drawInstance) {
                this.drawInstance.remove();
                this.drawInstance = null;
            }
        }
    }

    private drawBox(): void {
        this.drawInstance = this.canvas.rect();
        this.drawInstance.draw({
            snapToGrid: 0.1,
        }).addClass('cvat_canvas_shape_drawing').attr({
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
        }).on('drawstop', (e: Event): void => {
            const frameWidth = this.geometry.image.width;
            const frameHeight = this.geometry.image.height;
            const bbox = (e.target as SVGRectElement).getBBox();

            let [xtl, ytl, xbr, ybr] = translateFromSVG(
                this.canvas.node as any as SVGSVGElement,
                [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height],
            );

            ([xtl, ytl, xbr, ybr] = translateToSVG(
                this.background,
                [xtl, ytl, xbr, ybr],
            ));

            xtl = Math.min(Math.max(xtl, 0), frameWidth);
            xbr = Math.min(Math.max(xbr, 0), frameWidth);
            ytl = Math.min(Math.max(ytl, 0), frameHeight);
            ybr = Math.min(Math.max(ybr, 0), frameHeight);

            if ((xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD) {
                this.onDrawDone({
                    points: [xtl, ytl, xbr, ybr],
                });
            } else {
                this.onDrawDone(null);
            }
        });
    }

    private drawPolyshape(): void {
        let size = this.drawData.numberOfPoints;
        const sizeDecrement = function sizeDecrement(): void {
            if (!--size) {
                this.drawInstance.draw('done');
            }
        }.bind(this);

        const sizeIncrement = function sizeIncrement(): void {
            size++;
        };

        if (this.drawData.numberOfPoints) {
            this.drawInstance.on('drawstart', sizeDecrement);
            this.drawInstance.on('drawpoint', sizeDecrement);
            this.drawInstance.on('undopoint', sizeIncrement);
        }

        // Add ability to cancel the latest drawn point
        const handleUndo = function handleUndo(e: MouseEvent): void {
            if (e.which === 3) {
                e.stopPropagation();
                e.preventDefault();
                this.drawInstance.draw('undo');
            }
        }.bind(this);
        this.canvas.node.addEventListener('mousedown', handleUndo);

        // Add ability to draw shapes by sliding
        // We need to remember last drawn point
        // to implementation of slide drawing
        const lastDrawnPoint: {
            x: number;
            y: number;
        } = {
            x: null,
            y: null,
        };

        const handleSlide = function handleSlide(e: MouseEvent): void {
            // TODO: Use enumeration after typification cvat-core
            if (e.shiftKey && ['polygon', 'polyline'].includes(this.drawData.shapeType)) {
                if (lastDrawnPoint.x === null || lastDrawnPoint.y === null) {
                    this.drawInstance.draw('point', e);
                } else {
                    const deltaTreshold = 15;
                    const delta = Math.sqrt(
                        ((e.clientX - lastDrawnPoint.x) ** 2)
                        + ((e.clientY - lastDrawnPoint.y) ** 2),
                    );
                    if (delta > deltaTreshold) {
                        this.drawInstance.draw('point', e);
                    }
                }
            }
        }.bind(this);
        this.canvas.node.addEventListener('mousemove', handleSlide);

        // We need scale just drawn points
        const self = this;
        this.drawInstance.on('drawstart drawpoint', (e: CustomEvent): void => {
            self.transform(self.geometry);
            lastDrawnPoint.x = e.detail.event.clientX;
            lastDrawnPoint.y = e.detail.event.clientY;
        });

        this.drawInstance.on('drawstop', (): void => {
            self.canvas.node.removeEventListener('mousedown', handleUndo);
            self.canvas.node.removeEventListener('mousemove', handleSlide);
        });

        this.drawInstance.on('drawdone', (e: CustomEvent): void => {
            let points = translateFromSVG(
                this.canvas.node as any as SVGSVGElement,
                (e.target as SVGElement)
                    .getAttribute('points')
                    .split(/[,\s]/g)
                    .map((coord): number => +coord),
            );

            points = translateToSVG(
                this.background,
                points,
            );

            const bbox = {
                xtl: Number.MAX_SAFE_INTEGER,
                ytl: Number.MAX_SAFE_INTEGER,
                xbr: Number.MAX_SAFE_INTEGER,
                ybr: Number.MAX_SAFE_INTEGER,
            };

            const frameWidth = this.geometry.image.width;
            const frameHeight = this.geometry.image.height;
            for (let i = 0; i < points.length - 1; i += 2) {
                points[i] = Math.min(Math.max(points[i], 0), frameWidth);
                points[i + 1] = Math.min(Math.max(points[i + 1], 0), frameHeight);

                bbox.xtl = Math.min(bbox.xtl, points[i]);
                bbox.ytl = Math.min(bbox.ytl, points[i + 1]);
                bbox.xbr = Math.max(bbox.xbr, points[i]);
                bbox.ybr = Math.max(bbox.ybr, points[i + 1]);
            }

            if (this.drawData.shapeType === 'polygon'
                && ((bbox.xbr - bbox.xtl) * (bbox.ybr - bbox.ytl) >= consts.AREA_THRESHOLD)) {
                this.onDrawDone({
                    points,
                });
            } else if (this.drawData.shapeType === 'polyline'
                && ((bbox.xbr - bbox.xtl) >= consts.SIZE_THRESHOLD
                || (bbox.ybr - bbox.ytl) >= consts.SIZE_THRESHOLD)) {
                this.onDrawDone({
                    points,
                });
            } else if (this.drawData.shapeType === 'points') {
                this.onDrawDone({
                    points,
                });
            } else {
                this.onDrawDone(null);
            }
        });
    }

    private drawPolygon(): void {
        this.drawInstance = (this.canvas as any).polygon().draw({
            snapToGrid: 0.1,
        }).addClass('cvat_canvas_shape_drawing').style({
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
        });

        this.drawPolyshape();
    }

    private drawPolyline(): void {
        this.drawInstance = (this.canvas as any).polyline().draw({
            snapToGrid: 0.1,
        }).addClass('cvat_canvas_shape_drawing').style({
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'fill-opacity': 0,
        });

        this.drawPolyshape();
    }

    private drawPoints(): void {
        this.drawInstance = (this.canvas as any).polygon().draw({
            snapToGrid: 0.1,
        }).addClass('cvat_canvas_shape_drawing').style({
            'stroke-width': 0,
            opacity: 0,
        });

        this.drawPolyshape();
    }

    private startDraw(): void {
        // TODO: Use enums after typification cvat-core
        if (this.drawData.shapeType === 'rectangle') {
            this.drawBox();
        } else if (this.drawData.shapeType === 'polygon') {
            this.drawPolygon();
        } else if (this.drawData.shapeType === 'polyline') {
            this.drawPolyline();
        } else if (this.drawData.shapeType === 'points') {
            this.drawPoints();
        }
    }

    public constructor(onDrawDone: any, canvas: SVG.Container, background: SVGSVGElement) {
        this.onDrawDone = onDrawDone;
        this.canvas = canvas;
        this.background = background;
        this.drawData = null;
        this.geometry = null;
        this.crosshair = null;
        this.drawInstance = null;

        this.canvas.node.addEventListener('mousemove', (e): void => {
            if (this.crosshair) {
                const [x, y] = translateToSVG(
                    this.canvas.node as any as SVGSVGElement,
                    [e.clientX, e.clientY],
                );

                this.crosshair.x.attr({
                    y1: y,
                    y2: y,
                });

                this.crosshair.y.attr({
                    x1: x,
                    x2: x,
                });
            }
        });
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;

        if (this.crosshair) {
            this.crosshair.x.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * geometry.scale),
            });
            this.crosshair.y.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * geometry.scale),
            });
        }

        if (this.drawInstance) {
            this.drawInstance.draw('transform');
            this.drawInstance.style({
                'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
            });

            const paintHandler = this.drawInstance.remember('_paintHandler');

            for (const point of (paintHandler as any).set.members) {
                point.style(
                    'stroke-width',
                    `${consts.BASE_STROKE_WIDTH / (3 * geometry.scale)}`,
                );
                point.attr(
                    'r',
                    `${consts.BASE_POINT_SIZE / (2 * geometry.scale)}`,
                );
            }
        }
    }

    public draw(drawData: DrawData, geometry: Geometry): void {
        this.geometry = geometry;

        if (drawData.enabled) {
            this.drawData = drawData;
            this.initDrawing();
            this.startDraw();
        } else {
            this.closeDrawing();
            this.drawData = drawData;
        }
    }
}

// TODO: handle initial state
