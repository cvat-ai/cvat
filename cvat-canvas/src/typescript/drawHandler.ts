// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import 'svg.draw.js';
import './svg.patch';

import { AutoborderHandler } from './autoborderHandler';
import {
    translateToSVG,
    displayShapeSize,
    ShapeSizeElement,
    stringifyPoints,
    pointsToNumberArray,
    BBox,
    Box,
} from './shared';
import Crosshair from './crosshair';
import consts from './consts';
import { DrawData, Geometry, RectDrawingMethod, Configuration, CuboidDrawingMethod } from './canvasModel';

import { cuboidFrom4Points } from './cuboid';

export interface DrawHandler {
    configurate(configuration: Configuration): void;
    draw(drawData: DrawData, geometry: Geometry): void;
    transform(geometry: Geometry): void;
    cancel(): void;
}

export class DrawHandlerImpl implements DrawHandler {
    // callback is used to notify about creating new shape
    private onDrawDone: (data: object | null, duration?: number, continueDraw?: boolean) => void;
    private startTimestamp: number;
    private canvas: SVG.Container;
    private text: SVG.Container;
    private cursorPosition: {
        x: number;
        y: number;
    };
    private crosshair: Crosshair;
    private drawData: DrawData;
    private geometry: Geometry;
    private autoborderHandler: AutoborderHandler;
    private autobordersEnabled: boolean;

    // we should use any instead of SVG.Shape because svg plugins cannot change declared interface
    // so, methods like draw() just undefined for SVG.Shape, but nevertheless they exist
    private drawInstance: any;
    private initialized: boolean;
    private canceled: boolean;
    private pointsGroup: SVG.G | null;
    private shapeSizeElement: ShapeSizeElement;

    private getFinalRectCoordinates(bbox: BBox): number[] {
        const frameWidth = this.geometry.image.width;
        const frameHeight = this.geometry.image.height;
        const { offset } = this.geometry;

        let [xtl, ytl, xbr, ybr] = [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height].map(
            (coord: number): number => coord - offset,
        );

        xtl = Math.min(Math.max(xtl, 0), frameWidth);
        xbr = Math.min(Math.max(xbr, 0), frameWidth);
        ytl = Math.min(Math.max(ytl, 0), frameHeight);
        ybr = Math.min(Math.max(ybr, 0), frameHeight);

        return [xtl, ytl, xbr, ybr];
    }

    private getFinalPolyshapeCoordinates(
        targetPoints: number[],
    ): {
        points: number[];
        box: Box;
    } {
        const { offset } = this.geometry;
        const points = targetPoints.map((coord: number): number => coord - offset);
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

    private getFinalCuboidCoordinates(
        targetPoints: number[],
    ): {
        points: number[];
        box: Box;
    } {
        const { offset } = this.geometry;
        let points = targetPoints;

        const box = {
            xtl: 0,
            ytl: 0,
            xbr: Number.MAX_SAFE_INTEGER,
            ybr: Number.MAX_SAFE_INTEGER,
        };

        const frameWidth = this.geometry.image.width;
        const frameHeight = this.geometry.image.height;

        const cuboidOffsets = [];
        const minCuboidOffset = {
            d: Number.MAX_SAFE_INTEGER,
            dx: 0,
            dy: 0,
        };

        for (let i = 0; i < points.length - 1; i += 2) {
            const [x, y] = points.slice(i);

            if (x >= offset && x <= offset + frameWidth && y >= offset && y <= offset + frameHeight) continue;

            let xOffset = 0;
            let yOffset = 0;

            if (x < offset) {
                xOffset = offset - x;
            } else if (x > offset + frameWidth) {
                xOffset = offset + frameWidth - x;
            }

            if (y < offset) {
                yOffset = offset - y;
            } else if (y > offset + frameHeight) {
                yOffset = offset + frameHeight - y;
            }

            cuboidOffsets.push([xOffset, yOffset]);
        }

        if (cuboidOffsets.length === points.length / 2) {
            cuboidOffsets.forEach((offsetCoords: number[]): void => {
                if (Math.sqrt(offsetCoords[0] ** 2 + offsetCoords[1] ** 2) < minCuboidOffset.d) {
                    minCuboidOffset.d = Math.sqrt(offsetCoords[0] ** 2 + offsetCoords[1] ** 2);
                    [minCuboidOffset.dx, minCuboidOffset.dy] = offsetCoords;
                }
            });

            points = points.map((coord: number, i: number): number => {
                const finalCoord = coord + (i % 2 === 0 ? minCuboidOffset.dx : minCuboidOffset.dy);

                if (i % 2 === 0) {
                    box.xtl = Math.max(box.xtl, finalCoord);
                    box.xbr = Math.min(box.xbr, finalCoord);
                } else {
                    box.ytl = Math.max(box.ytl, finalCoord);
                    box.ybr = Math.min(box.ybr, finalCoord);
                }

                return finalCoord;
            });
        }

        return {
            points: points.map((coord: number): number => coord - offset),
            box,
        };
    }

    private addCrosshair(): void {
        const { x, y } = this.cursorPosition;
        this.crosshair.show(this.canvas, x, y, this.geometry.scale);
    }

    private removeCrosshair(): void {
        this.crosshair.hide();
    }

    private release(): void {
        if (!this.initialized) {
            // prevents recursive calls
            return;
        }

        this.autoborderHandler.autoborder(false);
        this.initialized = false;
        this.canvas.off('mousedown.draw');
        this.canvas.off('mousemove.draw');
        this.canvas.off('click.draw');

        if (this.pointsGroup) {
            this.pointsGroup.remove();
            this.pointsGroup = null;
        }

        // Draw plugin in some cases isn't activated
        // For example when draw from initialState
        // Or when no drawn points, but we call cancel() drawing
        // We check if it is activated with remember function
        if (this.drawInstance.remember('_paintHandler')) {
            if (
                this.drawData.shapeType !== 'rectangle' &&
                this.drawData.cuboidDrawingMethod !== CuboidDrawingMethod.CLASSIC
            ) {
                // Check for unsaved drawn shapes
                this.drawInstance.draw('done');
            }
            // Clear drawing
            this.drawInstance.draw('stop');
        }

        this.drawInstance.off();
        this.drawInstance.remove();
        this.drawInstance = null;

        if (this.shapeSizeElement) {
            this.shapeSizeElement.rm();
            this.shapeSizeElement = null;
        }

        if (this.crosshair) {
            this.removeCrosshair();
        }

        this.onDrawDone(null);
    }

    private initDrawing(): void {
        if (this.drawData.crosshair) {
            this.addCrosshair();
        }
    }

    private drawBox(): void {
        this.drawInstance = this.canvas.rect();
        this.drawInstance
            .on('drawstop', (e: Event): void => {
                const bbox = (e.target as SVGRectElement).getBBox();
                const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
                const { shapeType, redraw: clientID } = this.drawData;
                this.release();

                if (this.canceled) return;
                if ((xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD) {
                    this.onDrawDone(
                        {
                            clientID,
                            shapeType,
                            points: [xtl, ytl, xbr, ybr],
                        },
                        Date.now() - this.startTimestamp,
                    );
                }
            })
            .on('drawupdate', (): void => {
                this.shapeSizeElement.update(this.drawInstance);
            })
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
    }

    private drawBoxBy4Points(): void {
        let numberOfPoints = 0;
        this.drawInstance = (this.canvas as any)
            .polygon()
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': 0,
                opacity: 0,
            })
            .on('drawstart', (): void => {
                // init numberOfPoints as one on drawstart
                numberOfPoints = 1;
            })
            .on('drawpoint', (e: CustomEvent): void => {
                // increase numberOfPoints by one on drawpoint
                numberOfPoints += 1;

                // finish if numberOfPoints are exactly four
                if (numberOfPoints === 4) {
                    const bbox = (e.target as SVGPolylineElement).getBBox();
                    const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
                    const { shapeType, redraw: clientID } = this.drawData;
                    this.cancel();

                    if ((xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD) {
                        this.onDrawDone(
                            {
                                shapeType,
                                clientID,
                                points: [xtl, ytl, xbr, ybr],
                            },
                            Date.now() - this.startTimestamp,
                        );
                    }
                }
            })
            .on('undopoint', (): void => {
                if (numberOfPoints > 0) {
                    numberOfPoints -= 1;
                }
            });

        this.drawPolyshape();
    }

    private drawPolyshape(): void {
        let size = this.drawData.shapeType === 'cuboid' ? 4 : this.drawData.numberOfPoints;

        const sizeDecrement = (): void => {
            if (--size === 0) {
                // we need additional settimeout because we cannot invoke draw('done')
                // from event listener for drawstart event
                // because of implementation of svg.js
                setTimeout((): void => this.drawInstance.draw('done'));
            }
        };

        this.drawInstance.on('drawstart', sizeDecrement);
        this.drawInstance.on('drawpoint', sizeDecrement);
        this.drawInstance.on('drawupdate', (): void => this.transform(this.geometry));
        this.drawInstance.on('undopoint', (): number => size++);

        // Add ability to cancel the latest drawn point
        this.canvas.on('mousedown.draw', (e: MouseEvent): void => {
            if (e.button === 2) {
                e.stopPropagation();
                e.preventDefault();
                this.drawInstance.draw('undo');
            }
        });

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

        this.canvas.on('mousemove.draw', (e: MouseEvent): void => {
            // TODO: Use enumeration after typification cvat-core
            if (e.shiftKey && ['polygon', 'polyline'].includes(this.drawData.shapeType)) {
                if (lastDrawnPoint.x === null || lastDrawnPoint.y === null) {
                    this.drawInstance.draw('point', e);
                } else {
                    this.drawInstance.draw('update', e);
                    const deltaTreshold = 15;
                    const delta = Math.sqrt((e.clientX - lastDrawnPoint.x) ** 2 + (e.clientY - lastDrawnPoint.y) ** 2);
                    if (delta > deltaTreshold) {
                        this.drawInstance.draw('point', e);
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }
        });

        // We need scale just drawn points
        this.drawInstance.on('drawstart drawpoint', (e: CustomEvent): void => {
            this.transform(this.geometry);
            lastDrawnPoint.x = e.detail.event.clientX;
            lastDrawnPoint.y = e.detail.event.clientY;
        });

        this.drawInstance.on('drawdone', (e: CustomEvent): void => {
            const targetPoints = pointsToNumberArray((e.target as SVGElement).getAttribute('points'));
            const { shapeType, redraw: clientID } = this.drawData;
            const { points, box } =
                shapeType === 'cuboid'
                    ? this.getFinalCuboidCoordinates(targetPoints)
                    : this.getFinalPolyshapeCoordinates(targetPoints);
            this.release();

            if (this.canceled) return;
            if (
                shapeType === 'polygon' &&
                (box.xbr - box.xtl) * (box.ybr - box.ytl) >= consts.AREA_THRESHOLD &&
                points.length >= 3 * 2
            ) {
                this.onDrawDone(
                    {
                        clientID,
                        shapeType,
                        points,
                    },
                    Date.now() - this.startTimestamp,
                );
            } else if (
                shapeType === 'polyline' &&
                (box.xbr - box.xtl >= consts.SIZE_THRESHOLD || box.ybr - box.ytl >= consts.SIZE_THRESHOLD) &&
                points.length >= 2 * 2
            ) {
                this.onDrawDone(
                    {
                        clientID,
                        shapeType,
                        points,
                    },
                    Date.now() - this.startTimestamp,
                );
            } else if (shapeType === 'points' && (e.target as any).getAttribute('points') !== '0,0') {
                this.onDrawDone(
                    {
                        clientID,
                        shapeType,
                        points,
                    },
                    Date.now() - this.startTimestamp,
                );
                // TODO: think about correct constraign for cuboids
            } else if (shapeType === 'cuboid' && points.length === 4 * 2) {
                this.onDrawDone(
                    {
                        clientID,
                        shapeType,
                        points: cuboidFrom4Points(points),
                    },
                    Date.now() - this.startTimestamp,
                );
            }
        });
    }

    private drawPolygon(): void {
        this.drawInstance = (this.canvas as any)
            .polygon()
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });

        this.drawPolyshape();
        if (this.autobordersEnabled) {
            this.autoborderHandler.autoborder(true, this.drawInstance, this.drawData.redraw);
        }
    }

    private drawPolyline(): void {
        this.drawInstance = (this.canvas as any)
            .polyline()
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': 0,
            });

        this.drawPolyshape();
        if (this.autobordersEnabled) {
            this.autoborderHandler.autoborder(true, this.drawInstance, this.drawData.redraw);
        }
    }

    private drawPoints(): void {
        this.drawInstance = (this.canvas as any).polygon().addClass('cvat_canvas_shape_drawing').attr({
            'stroke-width': 0,
            opacity: 0,
        });

        this.drawPolyshape();
    }

    private drawCuboidBy4Points(): void {
        this.drawInstance = (this.canvas as any)
            .polyline()
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.drawPolyshape();
    }

    private drawCuboid(): void {
        this.drawInstance = this.canvas.rect();
        this.drawInstance
            .on('drawstop', (e: Event): void => {
                const bbox = (e.target as SVGRectElement).getBBox();
                const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
                const { shapeType } = this.drawData;
                this.release();

                if (this.canceled) return;
                if ((xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD) {
                    const d = { x: (xbr - xtl) * 0.1, y: (ybr - ytl) * 0.1 };
                    this.onDrawDone(
                        {
                            shapeType,
                            points: cuboidFrom4Points([xtl, ybr, xbr, ybr, xbr, ytl, xbr + d.x, ytl - d.y]),
                        },
                        Date.now() - this.startTimestamp,
                    );
                }
            })
            .on('drawupdate', (): void => {
                this.shapeSizeElement.update(this.drawInstance);
            })
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
    }

    private pastePolyshape(): void {
        this.drawInstance.on('done', (e: CustomEvent): void => {
            const targetPoints = this.drawInstance
                .attr('points')
                .split(/[,\s]/g)
                .map((coord: string): number => +coord);

            const { points } =
                this.drawData.initialState.shapeType === 'cuboid'
                    ? this.getFinalCuboidCoordinates(targetPoints)
                    : this.getFinalPolyshapeCoordinates(targetPoints);

            if (!e.detail.originalEvent.ctrlKey) {
                this.release();
            }

            this.onDrawDone(
                {
                    shapeType: this.drawData.initialState.shapeType,
                    objectType: this.drawData.initialState.objectType,
                    points,
                    occluded: this.drawData.initialState.occluded,
                    attributes: { ...this.drawData.initialState.attributes },
                    label: this.drawData.initialState.label,
                    color: this.drawData.initialState.color,
                },
                Date.now() - this.startTimestamp,
                e.detail.originalEvent.ctrlKey,
            );
        });
    }

    // Common settings for rectangle and polyshapes
    private pasteShape(): void {
        function moveShape(shape: SVG.Shape, x: number, y: number): void {
            const bbox = shape.bbox();
            shape.move(x - bbox.width / 2, y - bbox.height / 2);
        }

        const { x: initialX, y: initialY } = this.cursorPosition;
        moveShape(this.drawInstance, initialX, initialY);

        this.canvas.on('mousemove.draw', (): void => {
            const { x, y } = this.cursorPosition; // was computer in another callback
            moveShape(this.drawInstance, x, y);
        });
    }

    private pasteBox(box: BBox): void {
        this.drawInstance = (this.canvas as any)
            .rect(box.width, box.height)
            .move(box.x, box.y)
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();

        this.drawInstance.on('done', (e: CustomEvent): void => {
            const bbox = this.drawInstance.node.getBBox();
            const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
            if (!e.detail.originalEvent.ctrlKey) {
                this.release();
            }

            this.onDrawDone(
                {
                    shapeType: this.drawData.initialState.shapeType,
                    objectType: this.drawData.initialState.objectType,
                    points: [xtl, ytl, xbr, ybr],
                    occluded: this.drawData.initialState.occluded,
                    attributes: { ...this.drawData.initialState.attributes },
                    label: this.drawData.initialState.label,
                    color: this.drawData.initialState.color,
                },
                Date.now() - this.startTimestamp,
                e.detail.originalEvent.ctrlKey,
            );
        });
    }

    private pastePolygon(points: string): void {
        this.drawInstance = (this.canvas as any)
            .polygon(points)
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pastePolyline(points: string): void {
        this.drawInstance = (this.canvas as any)
            .polyline(points)
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pasteCuboid(points: string): void {
        this.drawInstance = (this.canvas as any)
            .cube(points)
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'face-stroke': 'black',
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pastePoints(initialPoints: string): void {
        function moveShape(shape: SVG.PolyLine, group: SVG.G, x: number, y: number, scale: number): void {
            const bbox = shape.bbox();
            shape.move(x - bbox.width / 2, y - bbox.height / 2);

            const points = shape.attr('points').split(' ');
            const radius = consts.BASE_POINT_SIZE / scale;

            group.children().forEach((child: SVG.Element, idx: number): void => {
                const [px, py] = points[idx].split(',');
                child.move(px - radius / 2, py - radius / 2);
            });
        }

        const { x: initialX, y: initialY } = this.cursorPosition;
        this.pointsGroup = this.canvas.group();
        this.drawInstance = (this.canvas as any).polyline(initialPoints).addClass('cvat_canvas_shape_drawing').style({
            'stroke-width': 0,
        });

        let numOfPoints = initialPoints.split(' ').length;
        while (numOfPoints) {
            numOfPoints--;
            const radius = consts.BASE_POINT_SIZE / this.geometry.scale;
            const stroke = consts.POINTS_STROKE_WIDTH / this.geometry.scale;
            this.pointsGroup.circle().fill('white').stroke('black').attr({
                r: radius,
                'stroke-width': stroke,
            });
        }

        moveShape(this.drawInstance, this.pointsGroup, initialX, initialY, this.geometry.scale);

        this.canvas.on('mousemove.draw', (): void => {
            const { x, y } = this.cursorPosition; // was computer in another callback
            moveShape(this.drawInstance, this.pointsGroup, x, y, this.geometry.scale);
        });

        this.pastePolyshape();
    }

    private setupPasteEvents(): void {
        this.canvas.on('mousedown.draw', (e: MouseEvent): void => {
            if (e.button === 0 && !e.altKey) {
                this.drawInstance.fire('done', { originalEvent: e });
            }
        });
    }

    private setupDrawEvents(): void {
        let initialized = false;

        this.canvas.on('mousedown.draw', (e: MouseEvent): void => {
            if (e.button === 0 && !e.altKey) {
                if (!initialized) {
                    this.drawInstance.draw(e, { snapToGrid: 0.1 });
                    initialized = true;
                } else {
                    this.drawInstance.draw(e);
                }
            }
        });
    }

    private startDraw(): void {
        // TODO: Use enums after typification cvat-core
        if (this.drawData.initialState) {
            const { offset } = this.geometry;
            if (this.drawData.shapeType === 'rectangle') {
                const [xtl, ytl, xbr, ybr] = this.drawData.initialState.points.map(
                    (coord: number): number => coord + offset,
                );

                this.pasteBox({
                    x: xtl,
                    y: ytl,
                    width: xbr - xtl,
                    height: ybr - ytl,
                });
            } else {
                const points = this.drawData.initialState.points.map((coord: number): number => coord + offset);
                const stringifiedPoints = stringifyPoints(points);

                if (this.drawData.shapeType === 'polygon') {
                    this.pastePolygon(stringifiedPoints);
                } else if (this.drawData.shapeType === 'polyline') {
                    this.pastePolyline(stringifiedPoints);
                } else if (this.drawData.shapeType === 'points') {
                    this.pastePoints(stringifiedPoints);
                } else if (this.drawData.shapeType === 'cuboid') {
                    this.pasteCuboid(stringifiedPoints);
                }
            }
            this.setupPasteEvents();
        } else {
            if (this.drawData.shapeType === 'rectangle') {
                if (this.drawData.rectDrawingMethod === RectDrawingMethod.EXTREME_POINTS) {
                    // draw box by extreme clicking
                    this.drawBoxBy4Points();
                } else {
                    // default box drawing
                    this.drawBox();
                    // Draw instance was initialized after drawBox();
                    this.shapeSizeElement = displayShapeSize(this.canvas, this.text);
                }
            } else if (this.drawData.shapeType === 'polygon') {
                this.drawPolygon();
            } else if (this.drawData.shapeType === 'polyline') {
                this.drawPolyline();
            } else if (this.drawData.shapeType === 'points') {
                this.drawPoints();
            } else if (this.drawData.shapeType === 'cuboid') {
                if (this.drawData.cuboidDrawingMethod === CuboidDrawingMethod.CORNER_POINTS) {
                    this.drawCuboidBy4Points();
                } else {
                    this.drawCuboid();
                    this.shapeSizeElement = displayShapeSize(this.canvas, this.text);
                }
            }
            this.setupDrawEvents();
        }

        this.startTimestamp = Date.now();
        this.initialized = true;
    }

    public constructor(
        onDrawDone: (data: object | null, duration?: number, continueDraw?: boolean) => void,
        canvas: SVG.Container,
        text: SVG.Container,
        autoborderHandler: AutoborderHandler,
    ) {
        this.autoborderHandler = autoborderHandler;
        this.autobordersEnabled = false;
        this.startTimestamp = Date.now();
        this.onDrawDone = onDrawDone;
        this.canvas = canvas;
        this.text = text;
        this.initialized = false;
        this.canceled = false;
        this.drawData = null;
        this.geometry = null;
        this.crosshair = new Crosshair();
        this.drawInstance = null;
        this.pointsGroup = null;
        this.cursorPosition = {
            x: 0,
            y: 0,
        };

        this.canvas.on('mousemove.crosshair', (e: MouseEvent): void => {
            const [x, y] = translateToSVG((this.canvas.node as any) as SVGSVGElement, [e.clientX, e.clientY]);
            this.cursorPosition = { x, y };
            if (this.crosshair) {
                this.crosshair.move(x, y);
            }
        });
    }

    public configurate(configuration: Configuration): void {
        if (typeof configuration.autoborders === 'boolean') {
            this.autobordersEnabled = configuration.autoborders;
            if (this.drawInstance) {
                if (this.autobordersEnabled) {
                    this.autoborderHandler.autoborder(true, this.drawInstance, this.drawData.redraw);
                } else {
                    this.autoborderHandler.autoborder(false);
                }
            }
        }
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;

        if (this.shapeSizeElement && this.drawInstance && this.drawData.shapeType === 'rectangle') {
            this.shapeSizeElement.update(this.drawInstance);
        }

        if (this.crosshair) {
            this.crosshair.scale(this.geometry.scale);
        }

        if (this.pointsGroup) {
            for (const point of this.pointsGroup.children()) {
                point.attr({
                    'stroke-width': consts.POINTS_STROKE_WIDTH / geometry.scale,
                    r: consts.BASE_POINT_SIZE / geometry.scale,
                });
            }
        }

        if (this.drawInstance) {
            this.drawInstance.draw('transform');
            this.drawInstance.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
            });

            const paintHandler = this.drawInstance.remember('_paintHandler');

            for (const point of (paintHandler as any).set.members) {
                point.attr('stroke-width', `${consts.POINTS_STROKE_WIDTH / geometry.scale}`);
                point.attr('r', `${consts.BASE_POINT_SIZE / geometry.scale}`);
            }
        }
    }

    public draw(drawData: DrawData, geometry: Geometry): void {
        this.geometry = geometry;

        if (drawData.enabled) {
            this.canceled = false;
            this.drawData = drawData;
            this.initDrawing();
            this.startDraw();
        } else {
            this.release();
            this.drawData = drawData;
        }
    }

    public cancel(): void {
        this.canceled = true;
        this.release();
    }
}
