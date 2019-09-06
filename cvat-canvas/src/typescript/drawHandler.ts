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
    translateBetweenSVG,
    displayShapeSize,
    ShapeSizeElement,
    pointsToString,
    pointsToArray,
    BBox,
    Box,
} from './shared';

export interface DrawHandler {
    draw(drawData: DrawData, geometry: Geometry): void;
    cancel(): void;
}

export class DrawHandlerImpl implements DrawHandler {
    // callback is used to notify about creating new shape
    private onDrawDone: (data: object) => void;
    private canvas: SVG.Container;
    private text: SVG.Container;
    private background: SVGSVGElement;
    private crosshair: {
        x: SVG.Line;
        y: SVG.Line;
    };
    private drawData: DrawData;
    private geometry: Geometry;

    // we should use any instead of SVG.Shape because svg plugins cannot change declared interface
    // so, methods like draw() just undefined for SVG.Shape, but nevertheless they exist
    private drawInstance: any;
    private shapeSizeElement: ShapeSizeElement;

    private getFinalRectCoordinates(bbox: BBox): number[] {
        const frameWidth = this.geometry.image.width;
        const frameHeight = this.geometry.image.height;

        let [xtl, ytl, xbr, ybr] = translateBetweenSVG(
            this.canvas.node as any as SVGSVGElement,
            this.background,
            [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height],
        );

        xtl = Math.min(Math.max(xtl, 0), frameWidth);
        xbr = Math.min(Math.max(xbr, 0), frameWidth);
        ytl = Math.min(Math.max(ytl, 0), frameHeight);
        ybr = Math.min(Math.max(ybr, 0), frameHeight);

        return [xtl, ytl, xbr, ybr];
    }

    private getFinalPolyshapeCoordinates(targetPoints: number[]): {
        points: number[];
        box: Box;
    } {
        const points = translateBetweenSVG(
            this.canvas.node as any as SVGSVGElement,
            this.background,
            targetPoints,
        );

        const box = {
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

            box.xtl = Math.min(box.xtl, points[i]);
            box.ytl = Math.min(box.ytl, points[i + 1]);
            box.xbr = Math.max(box.xbr, points[i]);
            box.ybr = Math.max(box.ybr, points[i + 1]);
        }

        return {
            points,
            box,
        };
    }

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

    private release(): void {
        this.canvas.off('mousedown.draw');
        this.canvas.off('mousemove.draw');
        this.canvas.off('click.draw');

        if (this.drawInstance) {
            // Draw plugin isn't activated when draw from initialState
            // So, we don't need to use any draw events
            if (!this.drawData.initialState) {
                this.drawInstance.off('drawdone');
                this.drawInstance.off('drawstop');
                this.drawInstance.draw('stop');
            }

            this.drawInstance.remove();
            this.drawInstance = null;
        }

        if (this.shapeSizeElement) {
            this.shapeSizeElement.rm();
            this.shapeSizeElement = null;
        }

        if (this.crosshair) {
            this.removeCrosshair();
        }
    }

    private initDrawing(): void {
        if (this.drawData.crosshair) {
            this.addCrosshair();
        }
    }

    private closeDrawing(): void {
        if (this.drawInstance) {
            // Draw plugin isn't activated when draw from initialState
            // So, we don't need to use any draw events
            if (!this.drawData.initialState) {
                const { drawInstance } = this;
                this.drawInstance = null;
                if (this.drawData.shapeType === 'rectangle') {
                    drawInstance.draw('cancel');
                } else {
                    drawInstance.draw('done');
                }
                this.drawInstance = drawInstance;
                this.release();
            } else {
                this.release();
                this.onDrawDone(null);
            }

            // here is a cycle
            // onDrawDone => controller => model => view => closeDrawing
            // one call of closeDrawing is unuseful, but it's okey
        }
    }

    private drawBox(): void {
        this.drawInstance = this.canvas.rect();
        this.drawInstance.draw({
            snapToGrid: 0.1,
        }).addClass('cvat_canvas_shape_drawing').attr({
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            z_order: Number.MAX_SAFE_INTEGER,
        }).on('drawupdate', (): void => {
            this.shapeSizeElement.update(this.drawInstance);
        }).on('drawstop', (e: Event): void => {
            const bbox = (e.target as SVGRectElement).getBBox();
            const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);

            if ((xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD) {
                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
                    points: [xtl, ytl, xbr, ybr],
                });
            } else {
                this.onDrawDone(null);
            }
        });
    }

    private drawPolyshape(): void {
        this.drawInstance.attr({
            z_order: Number.MAX_SAFE_INTEGER,
        });

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
        this.canvas.on('mousedown.draw', handleUndo);

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
        this.canvas.on('mousemove.draw', handleSlide);

        // We need scale just drawn points
        const self = this;
        this.drawInstance.on('drawstart drawpoint', (e: CustomEvent): void => {
            self.transform(self.geometry);
            lastDrawnPoint.x = e.detail.event.clientX;
            lastDrawnPoint.y = e.detail.event.clientY;
        });

        this.drawInstance.on('drawdone', (e: CustomEvent): void => {
            const targetPoints = pointsToArray((e.target as SVGElement).getAttribute('points'));

            const {
                points,
                box,
            } = this.getFinalPolyshapeCoordinates(targetPoints);

            if (this.drawData.shapeType === 'polygon'
                && ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= consts.AREA_THRESHOLD)
                && points.length >= 3 * 2) {
                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
                    points,
                });
            } else if (this.drawData.shapeType === 'polyline'
                && ((box.xbr - box.xtl) >= consts.SIZE_THRESHOLD
                || (box.ybr - box.ytl) >= consts.SIZE_THRESHOLD)
                && points.length >= 2 * 2) {
                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
                    points,
                });
            } else if (this.drawData.shapeType === 'points'
                && (e.target as any).getAttribute('points') !== '0,0') {
                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
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

    private pastePolyshape(): void {
        this.canvas.on('click.draw', (e: MouseEvent): void => {
            const targetPoints = (e.target as SVGElement)
                .getAttribute('points')
                .split(/[,\s]/g)
                .map((coord): number => +coord);

            const { points } = this.getFinalPolyshapeCoordinates(targetPoints);
            this.release();
            this.onDrawDone({
                shapeType: this.drawData.shapeType,
                points,
                occluded: this.drawData.initialState.occluded,
                attributes: { ...this.drawData.initialState.attributes },
                label: this.drawData.initialState.label,
                color: this.drawData.initialState.color,
            });
        });
    }

    // Common settings for rectangle and polyshapes
    private pasteShape(): void {
        this.drawInstance.attr({
            z_order: Number.MAX_SAFE_INTEGER,
        });

        this.canvas.on('mousemove.draw', (e: MouseEvent): void => {
            const [x, y] = translateToSVG(
                this.canvas.node as any as SVGSVGElement,
                [e.clientX, e.clientY],
            );

            const bbox = this.drawInstance.bbox();
            this.drawInstance.move(x - bbox.width / 2, y - bbox.height / 2);
        });
    }

    private pasteBox(box: BBox): void {
        this.drawInstance = (this.canvas as any).rect(box.width, box.height)
            .move(box.x, box.y)
            .addClass('cvat_canvas_shape_drawing').style({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();

        this.canvas.on('click.draw', (e: MouseEvent): void => {
            const bbox = (e.target as SVGRectElement).getBBox();
            const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
            this.release();
            this.onDrawDone({
                shapeType: this.drawData.shapeType,
                points: [xtl, ytl, xbr, ybr],
                occluded: this.drawData.initialState.occluded,
                attributes: { ...this.drawData.initialState.attributes },
                label: this.drawData.initialState.label,
                color: this.drawData.initialState.color,
            });
        });
    }


    private pastePolygon(points: string): void {
        this.drawInstance = (this.canvas as any).polygon(points)
            .addClass('cvat_canvas_shape_drawing').style({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pastePolyline(points: string): void {
        this.drawInstance = (this.canvas as any).polyline(points)
            .addClass('cvat_canvas_shape_drawing').style({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pastePoints(points: string): void {
        this.drawInstance = (this.canvas as any).polyline(points)
            .addClass('cvat_canvas_shape_drawing').style({
                'stroke-width': 0,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private startDraw(): void {
        // TODO: Use enums after typification cvat-core
        if (this.drawData.initialState) {
            if (this.drawData.shapeType === 'rectangle') {
                const [xtl, ytl, xbr, ybr] = translateBetweenSVG(
                    this.background,
                    this.canvas.node as any as SVGSVGElement,
                    this.drawData.initialState.points,
                );

                this.pasteBox({
                    x: xtl,
                    y: ytl,
                    width: xbr - xtl,
                    height: ybr - ytl,
                });
            } else {
                const points = translateBetweenSVG(
                    this.background,
                    this.canvas.node as any as SVGSVGElement,
                    this.drawData.initialState.points,
                );

                const stringifiedPoints = pointsToString(points);

                if (this.drawData.shapeType === 'polygon') {
                    this.pastePolygon(stringifiedPoints);
                } else if (this.drawData.shapeType === 'polyline') {
                    this.pastePolyline(stringifiedPoints);
                } else if (this.drawData.shapeType === 'points') {
                    this.pastePoints(stringifiedPoints);
                }
            }
        } else if (this.drawData.shapeType === 'rectangle') {
            this.drawBox();
            // Draw instance was initialized after drawBox();
            this.shapeSizeElement = displayShapeSize(this.canvas, this.text);
        } else if (this.drawData.shapeType === 'polygon') {
            this.drawPolygon();
        } else if (this.drawData.shapeType === 'polyline') {
            this.drawPolyline();
        } else if (this.drawData.shapeType === 'points') {
            this.drawPoints();
        }
    }

    public constructor(
        onDrawDone: (data: object) => void,
        canvas: SVG.Container,
        text: SVG.Container,
        background: SVGSVGElement,
    ) {
        this.onDrawDone = onDrawDone;
        this.canvas = canvas;
        this.text = text;
        this.background = background;
        this.drawData = null;
        this.geometry = null;
        this.crosshair = null;
        this.drawInstance = null;

        this.canvas.on('mousemove.crosshair', (e: MouseEvent): void => {
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

        if (this.shapeSizeElement && this.drawInstance && this.drawData.shapeType === 'rectangle') {
            this.shapeSizeElement.update(this.drawInstance);
        }

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
                    `${consts.POINTS_STROKE_WIDTH / geometry.scale}`,
                );
                point.attr(
                    'r',
                    `${consts.BASE_POINT_SIZE / geometry.scale}`,
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

    public cancel(): void {
        this.release();
        this.onDrawDone(null);
        // here is a cycle
        // onDrawDone => controller => model => view => closeDrawing
        // one call of closeDrawing is unuseful, but it's okey
    }
}
