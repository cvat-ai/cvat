// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import 'svg.draw.js';
import { CIRCLE_STROKE } from './svg.patch';

import { AutoborderHandler } from './autoborderHandler';
import {
    translateToSVG,
    displayShapeSize,
    ShapeSizeElement,
    stringifyPoints,
    BBox,
    Box,
    Point,
    readPointsFromShape,
    clamp,
    translateToCanvas,
    computeWrappingBox,
    makeSVGFromTemplate,
    setupSkeletonEdges,
    translateFromCanvas,
} from './shared';
import Crosshair from './crosshair';
import consts from './consts';
import {
    DrawData, Geometry, RectDrawingMethod, Configuration, CuboidDrawingMethod,
} from './canvasModel';

import { cuboidFrom4Points, intersection } from './cuboid';

export interface DrawHandler {
    configurate(configuration: Configuration): void;
    draw(drawData: DrawData, geometry: Geometry): void;
    transform(geometry: Geometry): void;
    cancel(): void;
}

interface FinalCoordinates {
    points: number[];
    box: Box;
}

function checkConstraint(shapeType: string, points: number[], box: Box | null = null): boolean {
    if (shapeType === 'rectangle') {
        const [xtl, ytl, xbr, ybr] = points;
        return (xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD;
    }

    if (shapeType === 'polygon') {
        return (box.xbr - box.xtl) * (box.ybr - box.ytl) >= consts.AREA_THRESHOLD && points.length >= 3 * 2;
    }

    if (shapeType === 'polyline') {
        return (box.xbr - box.xtl >= consts.SIZE_THRESHOLD ||
            box.ybr - box.ytl >= consts.SIZE_THRESHOLD) && points.length >= 2 * 2;
    }

    if (shapeType === 'points') {
        return points.length > 2 || (points.length === 2 && points[0] !== 0 && points[1] !== 0);
    }

    if (shapeType === 'ellipse') {
        const [rx, ry] = [points[2] - points[0], points[1] - points[3]];
        return rx * ry * Math.PI >= consts.AREA_THRESHOLD;
    }

    if (shapeType === 'cuboid') {
        return points.length === 4 * 2 || points.length === 8 * 2 ||
            (points.length === 2 * 2 && (points[2] - points[0]) * (points[3] - points[1]) >= consts.AREA_THRESHOLD);
    }

    if (shapeType === 'skeleton') {
        const [xtl, ytl, xbr, ybr] = points;
        return (xbr - xtl >= 1 || ybr - ytl >= 1);
    }

    return false;
}

export class DrawHandlerImpl implements DrawHandler {
    // callback is used to notify about creating new shape
    private onDrawDoneDefault: (
        data: object | null,
        duration?: number,
        continueDraw?: boolean,
        prevDrawData?: DrawData,
    ) => void;
    private startTimestamp: number;
    private canvas: SVG.Container;
    private text: SVG.Container;
    private cursorPosition: {
        x: number;
        y: number;
    };
    private crosshair: Crosshair;
    private drawData: DrawData | null;
    private geometry: Geometry;
    private autoborderHandler: AutoborderHandler;
    private autobordersEnabled: boolean;
    private controlPointsSize: number;
    private selectedShapeOpacity: number;
    private outlinedBorders: string;
    private isHidden: boolean;

    // we should use any instead of SVG.Shape because svg plugins cannot change declared interface
    // so, methods like draw() just undefined for SVG.Shape, but nevertheless they exist
    private drawInstance: any;
    private initialized: boolean;
    private canceled: boolean;
    private pointsGroup: SVG.G | null;
    private shapeSizeElement: ShapeSizeElement | null;

    private getFinalEllipseCoordinates(points: number[], fitIntoFrame: boolean): number[] {
        const { offset } = this.geometry;
        const [cx, cy, rightX, topY] = points.map((coord: number) => coord - offset);
        const [rx, ry] = [rightX - cx, cy - topY];
        const frameWidth = this.geometry.image.width;
        const frameHeight = this.geometry.image.height;
        const [fitCX, fitCY] = fitIntoFrame ?
            [clamp(cx, 0, frameWidth), clamp(cy, 0, frameHeight)] : [cx, cy];
        const [fitRX, fitRY] = fitIntoFrame ?
            [Math.min(rx, frameWidth - cx, cx), Math.min(ry, frameHeight - cy, cy)] : [rx, ry];
        return [fitCX, fitCY, fitCX + fitRX, fitCY - fitRY];
    }

    private getFinalRectCoordinates(points: number[], fitIntoFrame: boolean): number[] {
        const frameWidth = this.geometry.image.width;
        const frameHeight = this.geometry.image.height;
        const { offset } = this.geometry;

        let [xtl, ytl, xbr, ybr] = points.map((coord: number): number => coord - offset);

        if (fitIntoFrame) {
            xtl = Math.min(Math.max(xtl, 0), frameWidth);
            xbr = Math.min(Math.max(xbr, 0), frameWidth);
            ytl = Math.min(Math.max(ytl, 0), frameHeight);
            ybr = Math.min(Math.max(ybr, 0), frameHeight);
        }

        return [xtl, ytl, xbr, ybr];
    }

    private getFinalPolyshapeCoordinates(targetPoints: number[], fitIntoFrame: boolean): FinalCoordinates {
        const { offset } = this.geometry;
        let points = targetPoints.map((coord: number): number => coord - offset);
        const box = {
            xtl: Number.MAX_SAFE_INTEGER,
            ytl: Number.MAX_SAFE_INTEGER,
            xbr: Number.MIN_SAFE_INTEGER,
            ybr: Number.MIN_SAFE_INTEGER,
        };

        const frameWidth = this.geometry.image.width;
        const frameHeight = this.geometry.image.height;

        enum Direction {
            Horizontal,
            Vertical,
        }

        function isBetween(x1: number, x2: number, c: number): boolean {
            return c >= Math.min(x1, x2) && c <= Math.max(x1, x2);
        }

        const isInsideFrame = (p: Point, direction: Direction): boolean => {
            if (direction === Direction.Horizontal) {
                return isBetween(0, frameWidth, p.x);
            }
            return isBetween(0, frameHeight, p.y);
        };

        const findInersection = (p1: Point, p2: Point, p3: Point, p4: Point): number[] => {
            const intersectionPoint = intersection(p1, p2, p3, p4);
            if (
                intersectionPoint &&
                isBetween(p1.x, p2.x, intersectionPoint.x) &&
                isBetween(p1.y, p2.y, intersectionPoint.y)
            ) {
                return [intersectionPoint.x, intersectionPoint.y];
            }
            return [];
        };

        const findIntersectionsWithFrameBorders = (p1: Point, p2: Point, direction: Direction): number[] => {
            const resultPoints = [];
            const leftLine = [
                { x: 0, y: 0 },
                { x: 0, y: frameHeight },
            ];
            const topLine = [
                { x: frameWidth, y: 0 },
                { x: 0, y: 0 },
            ];
            const rightLine = [
                { x: frameWidth, y: frameHeight },
                { x: frameWidth, y: 0 },
            ];
            const bottomLine = [
                { x: 0, y: frameHeight },
                { x: frameWidth, y: frameHeight },
            ];

            if (direction === Direction.Horizontal) {
                resultPoints.push(...findInersection(p1, p2, leftLine[0], leftLine[1]));
                resultPoints.push(...findInersection(p1, p2, rightLine[0], rightLine[1]));
            } else {
                resultPoints.push(...findInersection(p1, p2, bottomLine[0], bottomLine[1]));
                resultPoints.push(...findInersection(p1, p2, topLine[0], topLine[1]));
            }

            if (resultPoints.length === 4) {
                if (
                    (p1.x === p2.x || Math.sign(resultPoints[0] - resultPoints[2]) !== Math.sign(p1.x - p2.x)) &&
                    (p1.y === p2.y || Math.sign(resultPoints[1] - resultPoints[3]) !== Math.sign(p1.y - p2.y))
                ) {
                    [resultPoints[0], resultPoints[2]] = [resultPoints[2], resultPoints[0]];
                    [resultPoints[1], resultPoints[3]] = [resultPoints[3], resultPoints[1]];
                }
            }
            return resultPoints;
        };

        const crop = (shapePoints: number[], direction: Direction): number[] => {
            const resultPoints = [];
            const isPolyline = this.drawData.shapeType === 'polyline';
            const isPolygon = this.drawData.shapeType === 'polygon';

            for (let i = 0; i < shapePoints.length - 1; i += 2) {
                const curPoint = { x: shapePoints[i], y: shapePoints[i + 1] };
                if (isInsideFrame(curPoint, direction)) {
                    resultPoints.push(shapePoints[i], shapePoints[i + 1]);
                }
                const isLastPoint = i === shapePoints.length - 2;
                if (isLastPoint && (isPolyline || (isPolygon && shapePoints.length === 4))) {
                    break;
                }
                const nextPoint = isLastPoint ?
                    { x: shapePoints[0], y: shapePoints[1] } :
                    { x: shapePoints[i + 2], y: shapePoints[i + 3] };
                const intersectionPoints = findIntersectionsWithFrameBorders(curPoint, nextPoint, direction);
                if (intersectionPoints.length !== 0) {
                    resultPoints.push(...intersectionPoints);
                }
            }
            return resultPoints;
        };

        if (fitIntoFrame) {
            points = crop(points, Direction.Horizontal);
            points = crop(points, Direction.Vertical);
        }

        for (let i = 0; i < points.length - 1; i += 2) {
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

    private getFinalCuboidCoordinates(targetPoints: number[]): FinalCoordinates {
        const { offset } = this.geometry;
        let points = targetPoints;

        const box = {
            xtl: Number.MAX_SAFE_INTEGER,
            ytl: Number.MAX_SAFE_INTEGER,
            xbr: Number.MIN_SAFE_INTEGER,
            ybr: Number.MIN_SAFE_INTEGER,
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
                const dx = offsetCoords[0] ** 2;
                const dy = offsetCoords[1] ** 2;
                if (Math.sqrt(dx + dy) < minCuboidOffset.d) {
                    minCuboidOffset.d = Math.sqrt(dx + dy);
                    [minCuboidOffset.dx, minCuboidOffset.dy] = offsetCoords;
                }
            });

            points = points.map((coord: number, i: number): number => {
                if (i % 2) {
                    return coord + minCuboidOffset.dy;
                }
                return coord + minCuboidOffset.dx;
            });
        }

        points.forEach((coord: number, i: number): number => {
            if (i % 2 === 0) {
                box.xtl = Math.min(box.xtl, coord);
                box.xbr = Math.max(box.xbr, coord);
            } else {
                box.ytl = Math.min(box.ytl, coord);
                box.ybr = Math.max(box.ybr, coord);
            }

            return coord;
        });

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

    private onDrawDone(...args: any[]): void {
        if (this.drawData.onDrawDone) {
            this.drawData.onDrawDone.call(this, ...args);
            return;
        }

        this.onDrawDoneDefault.call(this, ...args);
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

        // Draw plugin in some cases isn't activated
        // For example when draw from initialState
        // Or when no drawn points, but we call cancel() drawing
        // We check if it is activated with remember function
        if (this.drawInstance.remember('_paintHandler')) {
            if (['polygon', 'polyline', 'points'].includes(this.drawData.shapeType) ||
                (this.drawData.shapeType === 'cuboid' &&
                this.drawData.cuboidDrawingMethod === CuboidDrawingMethod.CORNER_POINTS)) {
                // Check for unsaved drawn shapes
                this.drawInstance.draw('done');
            }
            // Clear drawing
            this.drawInstance.draw('stop');
        } else {
            this.onDrawDone(null);
            if (this.drawInstance && this.drawData.shapeType === 'ellipse' && !this.drawData.initialState) {
                this.drawInstance.fire('drawstop');
            }
        }

        if (this.pointsGroup) {
            this.pointsGroup.remove();
            this.pointsGroup = null;
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
                const points = readPointsFromShape((e.target as any as { instance: SVG.Rect }).instance);
                const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(points, true);
                const { shapeType, redraw: clientID } = this.drawData;

                if (this.canceled) {
                    return;
                }

                this.release();
                if (checkConstraint('rectangle', [xtl, ytl, xbr, ybr])) {
                    this.onDrawDone({
                        clientID,
                        shapeType,
                        points: [xtl, ytl, xbr, ybr],
                    },
                    Date.now() - this.startTimestamp);
                } else {
                    this.onDrawDone(null);
                }
            })
            .on('drawupdate', (): void => {
                this.shapeSizeElement.update(this.drawInstance);
            })
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
            });
    }

    private drawEllipse(): void {
        this.drawInstance = (this.canvas as any).ellipse()
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
            });

        const initialPoint: {
            x: number;
            y: number;
        } = {
            x: null,
            y: null,
        };

        this.canvas.on('mousedown.draw', (e: MouseEvent): void => {
            if (e.button === 0 && !e.altKey) {
                if (initialPoint.x === null || initialPoint.y === null) {
                    const translated = translateToSVG(this.canvas.node as any as SVGSVGElement, [e.clientX, e.clientY]);
                    [initialPoint.x, initialPoint.y] = translated;
                } else {
                    this.drawInstance.fire('drawstop');
                }
            }
        });

        this.canvas.on('mousemove.draw', (e: MouseEvent): void => {
            if (initialPoint.x !== null && initialPoint.y !== null) {
                const translated = translateToSVG(this.canvas.node as any as SVGSVGElement, [e.clientX, e.clientY]);
                const rx = Math.abs(translated[0] - initialPoint.x) / 2;
                const ry = Math.abs(translated[1] - initialPoint.y) / 2;
                const cx = initialPoint.x + rx * Math.sign(translated[0] - initialPoint.x);
                const cy = initialPoint.y + ry * Math.sign(translated[1] - initialPoint.y);
                this.drawInstance.center(cx, cy);
                this.drawInstance.radius(rx, ry);
                this.shapeSizeElement.update(this.drawInstance);
            }
        });

        this.drawInstance.on('drawstop', () => {
            this.drawInstance.off('drawstop');
            const points = this.getFinalEllipseCoordinates(readPointsFromShape(this.drawInstance), false);
            const { shapeType, redraw: clientID } = this.drawData;

            if (this.canceled) {
                return;
            }

            this.release();
            if (checkConstraint('ellipse', points)) {
                this.onDrawDone(
                    {
                        clientID,
                        shapeType,
                        points,
                    },
                    Date.now() - this.startTimestamp,
                );
            } else {
                this.onDrawDone(null);
            }
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
                    const points = [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height];
                    const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(points, true);
                    const { shapeType, redraw: clientID } = this.drawData;
                    this.cancel();

                    if (checkConstraint('rectangle', [xtl, ytl, xbr, ybr])) {
                        this.onDrawDone({
                            shapeType,
                            clientID,
                            points: [xtl, ytl, xbr, ybr],
                        },
                        Date.now() - this.startTimestamp);
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
                    const deltaThreshold = 15;
                    const dx = (e.clientX - lastDrawnPoint.x) ** 2;
                    const dy = (e.clientY - lastDrawnPoint.y) ** 2;
                    const delta = Math.sqrt(dx + dy);
                    if (delta > deltaThreshold) {
                        this.drawInstance.draw('point', e);
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }
        });

        // We need to scale points that have been just drawn
        this.drawInstance.on('drawstart drawpoint', (e: CustomEvent): void => {
            this.transform(this.geometry);
            lastDrawnPoint.x = e.detail.event.clientX;
            lastDrawnPoint.y = e.detail.event.clientY;
        });

        this.drawInstance.on('drawdone', (e: CustomEvent): void => {
            const targetPoints = readPointsFromShape((e.target as any as { instance: SVG.Shape }).instance);
            const { shapeType, redraw: clientID } = this.drawData;
            const { points, box } = shapeType === 'cuboid' ?
                this.getFinalCuboidCoordinates(targetPoints) :
                this.getFinalPolyshapeCoordinates(targetPoints, true);

            if (this.canceled) {
                return;
            }

            this.release();
            if (checkConstraint(shapeType, points, box)) {
                if (shapeType === 'cuboid') {
                    this.onDrawDone(
                        { clientID, shapeType, points: cuboidFrom4Points(points) },
                        Date.now() - this.startTimestamp,
                    );
                    return;
                }

                this.onDrawDone({ clientID, shapeType, points }, Date.now() - this.startTimestamp);
            } else {
                this.onDrawDone(null);
            }
        });
    }

    private drawPolygon(): void {
        this.drawInstance = (this.canvas as any)
            .polygon()
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
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
                stroke: this.outlinedBorders,
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
                stroke: this.outlinedBorders,
            });
        this.drawPolyshape();
    }

    private drawCuboid(): void {
        this.drawInstance = this.canvas.rect();
        this.drawInstance
            .on('drawstop', (e: Event): void => {
                const points = readPointsFromShape((e.target as any as { instance: SVG.Rect }).instance);
                const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(points, true);
                const { shapeType, redraw: clientID } = this.drawData;

                if (this.canceled) {
                    return;
                }

                this.release();
                if (checkConstraint('cuboid', [xtl, ytl, xbr, ybr])) {
                    const d = { x: (xbr - xtl) * 0.1, y: (ybr - ytl) * 0.1 };
                    this.onDrawDone({
                        shapeType,
                        points: cuboidFrom4Points([xtl, ybr, xbr, ybr, xbr, ytl, xbr + d.x, ytl - d.y]),
                        clientID,
                    },
                    Date.now() - this.startTimestamp);
                } else {
                    this.onDrawDone(null);
                }
            })
            .on('drawupdate', (): void => {
                this.shapeSizeElement.update(this.drawInstance);
            })
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
            });
    }

    private drawSkeleton(): void {
        this.drawInstance = this.canvas.rect().attr({
            stroke: this.outlinedBorders,
        });
        this.pointsGroup = makeSVGFromTemplate(this.drawData.skeletonSVG);
        this.canvas.add(this.pointsGroup);
        this.pointsGroup.attr('stroke-width', consts.BASE_STROKE_WIDTH / this.geometry.scale);
        this.pointsGroup.attr('stroke', this.outlinedBorders);

        let minX = Number.MAX_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        let maxX = 0;
        let maxY = 0;

        this.pointsGroup.children().forEach((child: SVG.Element): void => {
            const cx = child.cx();
            const cy = child.cy();
            minX = Math.min(cx, minX);
            minY = Math.min(cy, minY);
            maxX = Math.max(cx, maxX);
            maxY = Math.max(cy, maxY);
        });

        this.drawInstance
            .on('drawstop', (e: Event): void => {
                const points = readPointsFromShape((e.target as any as { instance: SVG.Rect }).instance);
                const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(points, true);
                const elements: any[] = [];
                Array.from(this.pointsGroup.node.children).forEach((child: Element) => {
                    if (child.tagName === 'circle') {
                        const cx = +(child.getAttribute('cx') as string) + xtl;
                        const cy = +(child.getAttribute('cy') as string) + ytl;
                        const label = +child.getAttribute('data-label-id');
                        elements.push({
                            shapeType: 'points',
                            points: [cx, cy],
                            labelID: label,
                        });
                    }
                });

                const { shapeType, redraw: clientID } = this.drawData;

                if (this.canceled) {
                    return;
                }

                this.release();
                if (checkConstraint('skeleton', [xtl, ytl, xbr, ybr])) {
                    this.onDrawDone({
                        clientID,
                        shapeType,
                        elements,
                    },
                    Date.now() - this.startTimestamp);
                } else {
                    this.onDrawDone(null);
                }
            })
            .on('drawupdate', (): void => {
                const x = this.drawInstance.x();
                const y = this.drawInstance.y();
                const width = this.drawInstance.width();
                const height = this.drawInstance.height();
                this.pointsGroup.style({
                    transform: `translate(${x}px, ${y}px)`,
                });

                /* eslint-disable-next-line no-unsanitized/property */
                this.pointsGroup.node.innerHTML = this.drawData.skeletonSVG;
                Array.from(this.pointsGroup.node.children).forEach((child: Element) => {
                    const dataType = child.getAttribute('data-type');
                    if (child.tagName === 'circle' && dataType && dataType.includes('element')) {
                        child.setAttribute('r', `${this.controlPointsSize / this.geometry.scale}`);
                        let cx = +(child.getAttribute('cx') as string);
                        let cy = +(child.getAttribute('cy') as string);
                        const cxOffset = (cx - minX) / (maxX - minX);
                        const cyOffset = (cy - minY) / (maxY - minY);
                        cx = Number.isNaN(cxOffset) ? 0.5 * width : cxOffset * width;
                        cy = Number.isNaN(cyOffset) ? 0.5 * height : cyOffset * height;
                        child.setAttribute('cx', `${cx}`);
                        child.setAttribute('cy', `${cy}`);
                    }
                });

                Array.from(this.pointsGroup.node.children).forEach((child: Element) => {
                    const dataType = child.getAttribute('data-type');
                    if (child.tagName === 'line' && dataType && dataType.includes('edge')) {
                        child.setAttribute('stroke-width', 'inherit');
                        child.setAttribute('stroke', 'inherit');
                        const dataNodeFrom = child.getAttribute('data-node-from');
                        const dataNodeTo = child.getAttribute('data-node-to');
                        if (dataNodeFrom && dataNodeTo) {
                            const from = this.pointsGroup.node.querySelector(`[data-node-id="${dataNodeFrom}"]`);
                            const to = this.pointsGroup.node.querySelector(`[data-node-id="${dataNodeTo}"]`);

                            if (from && to) {
                                const x1 = from.getAttribute('cx');
                                const y1 = from.getAttribute('cy');
                                const x2 = to.getAttribute('cx');
                                const y2 = to.getAttribute('cy');

                                if (x1 && y1 && x2 && y2) {
                                    child.setAttribute('x1', x1);
                                    child.setAttribute('y1', y1);
                                    child.setAttribute('x2', x2);
                                    child.setAttribute('y2', y2);
                                }
                            }
                        }
                        let cx = +(child.getAttribute('cx') as string);
                        let cy = +(child.getAttribute('cy') as string);
                        const cxOffset = cx / 100;
                        const cyOffset = cy / 100;
                        cx = cxOffset * width;
                        cy = cyOffset * height;
                        child.setAttribute('cx', `${cx}`);
                        child.setAttribute('cy', `${cy}`);
                    }
                });
            })
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
            });
    }

    private pastePolyshape(): void {
        this.drawInstance.on('done', (e: CustomEvent): void => {
            const targetPoints = this.drawInstance
                .attr('points')
                .split(/[,\s]/g)
                .map((coord: string): number => +coord);

            const { shapeType } = this.drawData.initialState;
            const { points, box } = shapeType === 'cuboid' ?
                this.getFinalCuboidCoordinates(targetPoints) :
                this.getFinalPolyshapeCoordinates(targetPoints, true);

            if (checkConstraint(shapeType, points, box)) {
                this.onDrawDone(
                    {
                        shapeType,
                        objectType: this.drawData.initialState.objectType,
                        points,
                        occluded: this.drawData.initialState.occluded,
                        attributes: { ...this.drawData.initialState.attributes },
                        label: this.drawData.initialState.label,
                        color: this.drawData.initialState.color,
                    },
                    Date.now() - this.startTimestamp,
                    e.detail.originalEvent.ctrlKey,
                    this.drawData,
                );
            }

            if (!e.detail.originalEvent.ctrlKey) {
                this.release();
            }
        });
    }

    // Common settings for rectangle and polyshapes
    private pasteShape(): void {
        const moveShape = (shape: SVG.Shape, x: number, y: number): void => {
            const { rotation } = shape.transform();
            shape.untransform();
            shape.center(x, y);
            shape.rotate(rotation);
        };

        const { x: initialX, y: initialY } = this.cursorPosition;
        moveShape(this.drawInstance, initialX, initialY);

        this.canvas.on('mousemove.draw', (): void => {
            const { x, y } = this.cursorPosition; // was computed in another callback
            moveShape(this.drawInstance, x, y);
        });
    }

    private pasteBox(box: BBox, rotation: number): void {
        this.drawInstance = (this.canvas as any)
            .rect(box.width, box.height)
            .center(box.x, box.y)
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
            }).rotate(rotation);
        this.pasteShape();

        this.drawInstance.on('done', (e: CustomEvent): void => {
            const points = readPointsFromShape((e.target as any as { instance: SVG.Rect }).instance);
            const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(points, !this.drawData.initialState.rotation);
            if (checkConstraint('rectangle', [xtl, ytl, xbr, ybr])) {
                this.onDrawDone(
                    {
                        shapeType: this.drawData.initialState.shapeType,
                        objectType: this.drawData.initialState.objectType,
                        points: [xtl, ytl, xbr, ybr],
                        occluded: this.drawData.initialState.occluded,
                        attributes: { ...this.drawData.initialState.attributes },
                        label: this.drawData.initialState.label,
                        color: this.drawData.initialState.color,
                        rotation: this.drawData.initialState.rotation,
                    },
                    Date.now() - this.startTimestamp,
                    e.detail.originalEvent.ctrlKey,
                    this.drawData,
                );
            }

            if (!e.detail.originalEvent.ctrlKey) {
                this.release();
            }
        });
    }

    private pasteEllipse([cx, cy, rx, ry]: number[], rotation: number): void {
        this.drawInstance = (this.canvas as any)
            .ellipse(rx * 2, ry * 2)
            .center(cx, cy)
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
            }).rotate(rotation);
        this.pasteShape();

        this.drawInstance.on('done', (e: CustomEvent): void => {
            const points = this.getFinalEllipseCoordinates(
                readPointsFromShape((e.target as any as { instance: SVG.Ellipse }).instance), false,
            );
            if (checkConstraint('ellipse', points)) {
                this.onDrawDone(
                    {
                        shapeType: this.drawData.initialState.shapeType,
                        objectType: this.drawData.initialState.objectType,
                        points,
                        occluded: this.drawData.initialState.occluded,
                        attributes: { ...this.drawData.initialState.attributes },
                        label: this.drawData.initialState.label,
                        color: this.drawData.initialState.color,
                        rotation: this.drawData.initialState.rotation,
                    },
                    Date.now() - this.startTimestamp,
                    e.detail.originalEvent.ctrlKey,
                    this.drawData,
                );
            }

            if (!e.detail.originalEvent.ctrlKey) {
                this.release();
            }
        });
    }

    private pastePolygon(points: string): void {
        this.drawInstance = (this.canvas as any)
            .polygon(points)
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
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
                stroke: this.outlinedBorders,
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
                'face-stroke': this.outlinedBorders,
                'fill-opacity': this.selectedShapeOpacity,
                stroke: this.outlinedBorders,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pasteSkeleton(box: BBox, elements: any[]): void {
        const { offset } = this.geometry;
        let [xtl, ytl] = [box.x, box.y];

        this.pasteBox(box, 0);
        this.pointsGroup = makeSVGFromTemplate(this.drawData.skeletonSVG);
        this.pointsGroup.attr({
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            stroke: this.outlinedBorders,
        });
        this.canvas.add(this.pointsGroup);

        this.pointsGroup.children().forEach((child: SVG.Element): void => {
            const dataType = child.attr('data-type');
            if (child.node.tagName === 'circle' && dataType && dataType.includes('element')) {
                child.attr('r', `${this.controlPointsSize / this.geometry.scale}`);
                const labelID = +child.attr('data-label-id');
                const element = elements.find((_element: any): boolean => _element.label.id === labelID);
                if (element) {
                    const points = translateToCanvas(offset, element.points);
                    child.center(points[0], points[1]);
                }
            }
        });

        this.drawInstance.off('done').on('done', (e: CustomEvent) => {
            const result = {
                shapeType: this.drawData.initialState.shapeType,
                objectType: this.drawData.initialState.objectType,
                elements: this.drawData.initialState.elements.map((element: any) => ({
                    shapeType: element.shapeType,
                    outside: element.outside,
                    occluded: element.occluded,
                    label: element.label,
                    attributes: element.attributes,
                    points: (() => {
                        const circle = this.pointsGroup.children()
                            .find((child: SVG.Element) => child.attr('data-label-id') === element.label.id);
                        const points = translateFromCanvas(this.geometry.offset, [circle.cx(), circle.cy()]);
                        return points;
                    })(),
                })),
                occluded: this.drawData.initialState.occluded,
                attributes: { ...this.drawData.initialState.attributes },
                label: this.drawData.initialState.label,
                color: this.drawData.initialState.color,
                rotation: this.drawData.initialState.rotation,
            };

            this.onDrawDone(
                result,
                Date.now() - this.startTimestamp,
                e.detail.originalEvent.ctrlKey,
                this.drawData,
            );

            if (!e.detail.originalEvent.ctrlKey) {
                this.release();
            }
        });

        this.canvas.on('mousemove.draw', (): void => {
            const [newXtl, newYtl] = [
                this.drawInstance.x(), this.drawInstance.y(),
                this.drawInstance.width(), this.drawInstance.height(),
            ];
            const [xDiff, yDiff] = [newXtl - xtl, newYtl - ytl];
            xtl = newXtl;
            ytl = newYtl;
            this.pointsGroup.children().forEach((child: SVG.Element): void => {
                const dataType = child.attr('data-type');
                if (child.node.tagName === 'circle' && dataType && dataType.includes('element')) {
                    const [cx, cy] = [child.cx(), child.cy()];
                    child.center(cx + xDiff, cy + yDiff);
                }
            });
            this.pointsGroup.untransform();
            setupSkeletonEdges(this.pointsGroup, this.pointsGroup);
        });
    }

    private pastePoints(initialPoints: string): void {
        const moveShape = (shape: SVG.PolyLine, group: SVG.G, x: number, y: number, scale: number): void => {
            const bbox = shape.bbox();
            shape.move(x - bbox.width / 2, y - bbox.height / 2);

            const points = shape.attr('points').split(' ');
            const radius = this.controlPointsSize / scale;

            group.children().forEach((child: SVG.Element, idx: number): void => {
                const [px, py] = points[idx].split(',');
                child.move(px - radius / 2, py - radius / 2);
            });
        };

        const { x: initialX, y: initialY } = this.cursorPosition;
        this.pointsGroup = this.canvas.group();
        this.drawInstance = (this.canvas as any).polyline(initialPoints).addClass('cvat_canvas_shape_drawing').style({
            'stroke-width': 0,
        });

        let numOfPoints = initialPoints.split(' ').length;
        while (numOfPoints) {
            numOfPoints--;
            const radius = this.controlPointsSize / this.geometry.scale;
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
                const [xtl, ytl, xbr, ybr] = translateToCanvas(offset, this.drawData.initialState.points);
                this.pasteBox({
                    x: xtl,
                    y: ytl,
                    width: xbr - xtl,
                    height: ybr - ytl,
                }, this.drawData.initialState.rotation);
            } else if (this.drawData.shapeType === 'ellipse') {
                const [cx, cy, rightX, topY] = translateToCanvas(offset, this.drawData.initialState.points);
                this.pasteEllipse([cx, cy, rightX - cx, cy - topY], this.drawData.initialState.rotation);
            } else if (this.drawData.shapeType === 'skeleton') {
                const box = computeWrappingBox(
                    translateToCanvas(offset, this.drawData.initialState.points), consts.SKELETON_RECT_MARGIN,
                );
                this.pasteSkeleton(box, this.drawData.initialState.elements);
            } else {
                const points = translateToCanvas(offset, this.drawData.initialState.points);
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
                    this.drawBoxBy4Points(); // draw box by extreme clicking
                } else {
                    this.drawBox(); // default box drawing
                    // draw instance was initialized after drawBox();
                    this.shapeSizeElement = displayShapeSize(this.canvas, this.text);
                }
            } else if (this.drawData.shapeType === 'polygon') {
                this.drawPolygon();
            } else if (this.drawData.shapeType === 'polyline') {
                this.drawPolyline();
            } else if (this.drawData.shapeType === 'points') {
                this.drawPoints();
            } else if (this.drawData.shapeType === 'ellipse') {
                this.drawEllipse();
                this.shapeSizeElement = displayShapeSize(this.canvas, this.text);
            } else if (this.drawData.shapeType === 'cuboid') {
                if (this.drawData.cuboidDrawingMethod === CuboidDrawingMethod.CORNER_POINTS) {
                    this.drawCuboidBy4Points();
                } else {
                    this.drawCuboid();
                    this.shapeSizeElement = displayShapeSize(this.canvas, this.text);
                }
            } else if (this.drawData.shapeType === 'skeleton') {
                this.drawSkeleton();
            }

            if (this.drawData.shapeType !== 'ellipse') {
                this.setupDrawEvents();
            }
        }

        this.startTimestamp = Date.now();
        this.initialized = true;
    }

    public constructor(
        onDrawDone: DrawHandlerImpl['onDrawDoneDefault'],
        canvas: SVG.Container,
        text: SVG.Container,
        autoborderHandler: AutoborderHandler,
        geometry: Geometry,
        configuration: Configuration,
    ) {
        this.autoborderHandler = autoborderHandler;
        this.controlPointsSize = configuration.controlPointsSize;
        this.selectedShapeOpacity = configuration.selectedShapeOpacity;
        this.outlinedBorders = configuration.outlinedBorders || 'black';
        this.autobordersEnabled = false;
        this.isHidden = false;
        this.startTimestamp = Date.now();
        this.onDrawDoneDefault = onDrawDone;
        this.canvas = canvas;
        this.text = text;
        this.initialized = false;
        this.canceled = false;
        this.drawData = null;
        this.geometry = geometry;
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

    private strokePoint(point: SVG.Element): void {
        point.attr('stroke', this.isHidden ? 'none' : CIRCLE_STROKE);
        point.fill({ opacity: this.isHidden ? 0 : 1 });
    }

    private updateHidden(value: boolean) {
        this.isHidden = value;

        if (value) {
            this.canvas.attr('pointer-events', 'none');
        } else {
            this.canvas.attr('pointer-events', 'all');
        }
    }

    public configurate(configuration: Configuration): void {
        this.controlPointsSize = configuration.controlPointsSize;
        this.selectedShapeOpacity = configuration.selectedShapeOpacity;
        this.outlinedBorders = configuration.outlinedBorders || 'black';
        if (this.isHidden !== configuration.hideEditedObject) {
            this.updateHidden(configuration.hideEditedObject);
        }

        const isFillableRect = this.drawData &&
            this.drawData.shapeType === 'rectangle' &&
            (this.drawData.rectDrawingMethod === RectDrawingMethod.CLASSIC || this.drawData.initialState);
        const isFillableCuboid = this.drawData &&
            this.drawData.shapeType === 'cuboid' &&
            (this.drawData.cuboidDrawingMethod === CuboidDrawingMethod.CLASSIC || this.drawData.initialState);
        const isFilalblePolygon = this.drawData && this.drawData.shapeType === 'polygon';

        if (this.drawInstance && (isFillableRect || isFillableCuboid || isFilalblePolygon)) {
            this.drawInstance.fill({
                opacity: configuration.hideEditedObject ? 0 : configuration.selectedShapeOpacity,
            });
        }

        if (this.drawInstance && (isFilalblePolygon)) {
            const paintHandler = this.drawInstance.remember('_paintHandler');
            if (paintHandler) {
                for (const point of (paintHandler as any).set.members) {
                    this.strokePoint(point);
                }
            }
        }

        if (this.drawInstance && this.drawInstance.attr('stroke')) {
            this.drawInstance.attr('stroke', configuration.hideEditedObject ? 'none' : this.outlinedBorders);
        }

        if (this.pointsGroup && this.pointsGroup.attr('stroke')) {
            this.pointsGroup.attr('stroke', configuration.hideEditedObject ? 'none' : this.outlinedBorders);
        }

        this.autobordersEnabled = configuration.autoborders;
        if (this.drawInstance && !this.drawData.initialState) {
            if (this.autobordersEnabled) {
                this.autoborderHandler.autoborder(true, this.drawInstance, this.drawData.redraw);
            } else {
                this.autoborderHandler.autoborder(false);
            }
        }
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;

        if (this.shapeSizeElement && this.drawInstance && ['rectangle', 'ellipse'].includes(this.drawData.shapeType)) {
            this.shapeSizeElement.update(this.drawInstance);
        }

        if (this.crosshair) {
            this.crosshair.scale(this.geometry.scale);
        }

        if (this.pointsGroup) {
            this.pointsGroup.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });

            for (const point of this.pointsGroup.children()) {
                point.attr({
                    'stroke-width': consts.POINTS_STROKE_WIDTH / geometry.scale,
                    r: this.controlPointsSize / geometry.scale,
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
                this.strokePoint(point);
                point.attr('stroke-width', `${consts.POINTS_STROKE_WIDTH / geometry.scale}`);
                point.attr('r', `${this.controlPointsSize / geometry.scale}`);
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
