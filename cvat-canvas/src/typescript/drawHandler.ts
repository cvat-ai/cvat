// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';
import 'svg.draw.js';
import './svg.patch';

import {
    DrawData,
    Geometry,
    RectDrawingMethod,
} from './canvasModel';

import {
    translateToSVG,
    displayShapeSize,
    ShapeSizeElement,
    pointsToString,
    pointsToArray,
    BBox,
    Box,
} from './shared';

export interface DrawHandler {
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
    private crosshair: {
        x: SVG.Line;
        y: SVG.Line;
    };
    private drawData: DrawData;
    private geometry: Geometry;

    // we should use any instead of SVG.Shape because svg plugins cannot change declared interface
    // so, methods like draw() just undefined for SVG.Shape, but nevertheless they exist
    private drawInstance: any;
    private initialized: boolean;
    private pointsGroup: SVG.G | null;
    private shapeSizeElement: ShapeSizeElement;

    private getFinalRectCoordinates(bbox: BBox): number[] {
        const frameWidth = this.geometry.image.width;
        const frameHeight = this.geometry.image.height;
        const { offset } = this.geometry;

        let [xtl, ytl, xbr, ybr] = [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height]
            .map((coord: number): number => coord - offset);

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

    private addCrosshair(): void {
        const { x, y } = this.cursorPosition;
        this.crosshair = {
            x: this.canvas.line(0, y, this.canvas.node.clientWidth, y).attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * this.geometry.scale),
                zOrder: Number.MAX_SAFE_INTEGER,
            }).addClass('cvat_canvas_crosshair'),
            y: this.canvas.line(x, 0, x, this.canvas.node.clientHeight).attr({
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
        if (!this.initialized) {
            // prevents recursive calls
            return;
        }

        this.initialized = false;
        this.canvas.off('mousedown.draw');
        this.canvas.off('mouseup.draw');
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
            if (this.drawData.shapeType !== 'rectangle') {
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
    }

    private initDrawing(): void {
        if (this.drawData.crosshair) {
            this.addCrosshair();
        }
    }

    private drawBox(): void {
        this.drawInstance = this.canvas.rect();
        this.drawInstance.on('drawstop', (e: Event): void => {
            const bbox = (e.target as SVGRectElement).getBBox();
            const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
            const { shapeType } = this.drawData;
            this.cancel();

            if ((xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD) {
                this.onDrawDone({
                    shapeType,
                    points: [xtl, ytl, xbr, ybr],
                }, Date.now() - this.startTimestamp);
            }
        }).on('drawupdate', (): void => {
            this.shapeSizeElement.update(this.drawInstance);
        }).addClass('cvat_canvas_shape_drawing').attr({
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
        });
    }

    private drawBoxBy4Points(): void {
        let numberOfPoints = 0;
        this.drawInstance = (this.canvas as any).polygon()
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': 0,
                opacity: 0,
            }).on('drawstart', (): void => {
                // init numberOfPoints as one on drawstart
                numberOfPoints = 1;
            }).on('drawpoint', (e: CustomEvent): void => {
                // increase numberOfPoints by one on drawpoint
                numberOfPoints += 1;

                // finish if numberOfPoints are exactly four
                if (numberOfPoints === 4) {
                    const bbox = (e.target as SVGPolylineElement).getBBox();
                    const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
                    const { shapeType } = this.drawData;
                    this.cancel();

                    if ((xbr - xtl) * (ybr - ytl) >= consts.AREA_THRESHOLD) {
                        this.onDrawDone({
                            shapeType,
                            points: [xtl, ytl, xbr, ybr],
                        }, Date.now() - this.startTimestamp);
                    }
                }
            }).on('undopoint', (): void => {
                if (numberOfPoints > 0) {
                    numberOfPoints -= 1;
                }
            });

        this.drawPolyshape();
    }

    private drawPolyshape(): void {
        let size = this.drawData.shapeType === 'cuboid' ? 0 : this.drawData.numberOfPoints;

        if (this.drawData.shapeType === 'cuboid') this.addCrosshair();

        const sizeDecrement = (): void => {
            if (!--size) {
                this.drawInstance.draw('done');
            }
        };

        const sizeCuboidIncrement = (): void => {
            if (++size === 4) {
                this.drawInstance.draw('done');
            }
        };

        if (this.drawData.shapeType === 'cuboid') {
            this.drawInstance.on('drawstart', sizeCuboidIncrement);
            this.drawInstance.on('drawpoint', sizeCuboidIncrement);
            this.drawInstance.on('undopoint', (): number => size--);
        } else if (this.drawData.numberOfPoints) {
            this.drawInstance.on('drawstart', sizeDecrement);
            this.drawInstance.on('drawpoint', sizeDecrement);
            this.drawInstance.on('undopoint', (): number => size++);
        }

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
                    const deltaTreshold = 15;
                    const delta = Math.sqrt(
                        ((e.clientX - lastDrawnPoint.x) ** 2)
                        + ((e.clientY - lastDrawnPoint.y) ** 2),
                    );
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
            const targetPoints = pointsToArray((e.target as SVGElement).getAttribute('points'));

            const { points, box } = this.getFinalPolyshapeCoordinates(targetPoints);
            const { shapeType } = this.drawData;
            this.cancel();

            if (shapeType === 'polygon'
                && ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= consts.AREA_THRESHOLD)
                && points.length >= 3 * 2) {
                this.onDrawDone({
                    shapeType,
                    points,
                }, Date.now() - this.startTimestamp);
            } else if (shapeType === 'polyline'
                && ((box.xbr - box.xtl) >= consts.SIZE_THRESHOLD
                || (box.ybr - box.ytl) >= consts.SIZE_THRESHOLD)
                && points.length >= 2 * 2) {
                this.onDrawDone({
                    shapeType,
                    points,
                }, Date.now() - this.startTimestamp);
            } else if (shapeType === 'points'
                && (e.target as any).getAttribute('points') !== '0,0') {
                this.onDrawDone({
                    shapeType,
                    points,
                }, Date.now() - this.startTimestamp);
                // TODO: think about correct constraign for cuboids
            } else if (shapeType === 'cuboid'
                && points.length === 4 * 2) {
                this.onDrawDone({
                    shapeType,
                    points: DrawHandlerImpl.cuboidPointsBy4Points(points),
                }, Date.now() - this.startTimestamp);
            }
        });
    }

    private drawPolygon(): void {
        this.drawInstance = (this.canvas as any).polygon()
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });

        this.drawPolyshape();
    }

    private drawPolyline(): void {
        this.drawInstance = (this.canvas as any).polyline()
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'fill-opacity': 0,
            });

        this.drawPolyshape();
    }

    private drawPoints(): void {
        this.drawInstance = (this.canvas as any).polygon()
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': 0,
                opacity: 0,
            });

        this.drawPolyshape();
    }

    private static sortPointsClockwise(points: any[]): any[] {
        points.sort((a, b): number => a.y - b.y);
        // Get center y
        const cy = (points[0].y + points[points.length - 1].y) / 2;

        // Sort from right to left
        points.sort((a, b): number => b.x - a.x);

        // Get center x
        const cx = (points[0].x + points[points.length - 1].x) / 2;

        // Center point
        const center = {
            x: cx,
            y: cy,
        };

        // Starting angle used to reference other angles
        let startAng: number | undefined;
        points.forEach((point): void => {
            let ang = Math.atan2(point.y - center.y, point.x - center.x);
            if (!startAng) {
                startAng = ang;
            // ensure that all points are clockwise of the start point
            } else if (ang < startAng) {
                ang += Math.PI * 2;
            }
            // eslint-disable-next-line no-param-reassign
            point.angle = ang; // add the angle to the point
        });

        // first sort clockwise
        points.sort((a, b): number => a.angle - b.angle);
        return points.reverse();
    }

    private static setupCuboidPoints(actualPoints: any[]): any[] {
        let left;
        let right;
        let left2;
        let right2;
        let p1;
        let p2;
        let p3;
        let p4;

        const height = Math.abs(actualPoints[0].x - actualPoints[1].x)
            < Math.abs(actualPoints[1].x - actualPoints[2].x)
            ? Math.abs(actualPoints[1].y - actualPoints[0].y)
            : Math.abs(actualPoints[1].y - actualPoints[2].y);

        // seperate into left and right point
        // we pick the first and third point because we know assume they will be on
        // opposite corners
        if (actualPoints[0].x < actualPoints[2].x) {
            [left,, right] = actualPoints;
        } else {
            [right,, left] = actualPoints;
        }

        // get other 2 points using the given height
        if (left.y < right.y) {
            left2 = { x: left.x, y: left.y + height };
            right2 = { x: right.x, y: right.y - height };
        } else {
            left2 = { x: left.x, y: left.y - height };
            right2 = { x: right.x, y: right.y + height };
        }

        // get the vector for the last point relative to the previous point
        const vec = {
            x: actualPoints[3].x - actualPoints[2].x,
            y: actualPoints[3].y - actualPoints[2].y,
        };

        if (left.y < left2.y) {
            p1 = left;
            p2 = left2;
        } else {
            p1 = left2;
            p2 = left;
        }

        if (right.y < right2.y) {
            p3 = right;
            p4 = right2;
        } else {
            p3 = right2;
            p4 = right;
        }

        const p5 = { x: p3.x + vec.x, y: p3.y + vec.y + 0.1 };
        const p6 = { x: p4.x + vec.x, y: p4.y + vec.y - 0.1 };

        p1.y += 0.1;
        return [p1, p2, p3, p4, p5, p6];
    }

    private static cuboidPointsBy4Points(points: any[]): any[] {
        const actualPoints = [];
        for (let i = 0; i < 4; i++) {
            const [x, y] = points.slice(i * 2, i * 2 + 2);
            actualPoints.push({ x, y });
        }
        const unsortedPlanePoints = actualPoints.slice(0, 3);
        function rotate(array: any[], times: number): void{
            let t = times;
            while (t--) {
                const temp = array.shift();
                array.push(temp);
            }
        }

        const plane2 = {
            p1: actualPoints[0],
            p2: actualPoints[0],
            p3: actualPoints[0],
            p4: actualPoints[0],
        };

        // completing the plane
        const vector = {
            x: actualPoints[2].x - actualPoints[1].x,
            y: actualPoints[2].y - actualPoints[1].y,
        };

        // sorting the first plane
        unsortedPlanePoints.push({
            x: actualPoints[0].x + vector.x,
            y: actualPoints[0].y + vector.y,
        });
        const sortedPlanePoints = DrawHandlerImpl.sortPointsClockwise(unsortedPlanePoints);
        let leftIndex = 0;
        for (let i = 0; i < 4; i++) {
            leftIndex = sortedPlanePoints[i].x < sortedPlanePoints[leftIndex].x ? i : leftIndex;
        }
        rotate(sortedPlanePoints, leftIndex);
        const plane1 = {
            p1: sortedPlanePoints[0],
            p2: sortedPlanePoints[1],
            p3: sortedPlanePoints[2],
            p4: sortedPlanePoints[3],
        };

        const vec = {
            x: actualPoints[3].x - actualPoints[2].x,
            y: actualPoints[3].y - actualPoints[2].y,
        };
        // determine the orientation
        const angle = Math.atan2(vec.y, vec.x);

        // making the other plane
        plane2.p1 = { x: plane1.p1.x + vec.x, y: plane1.p1.y + vec.y };
        plane2.p2 = { x: plane1.p2.x + vec.x, y: plane1.p2.y + vec.y };
        plane2.p3 = { x: plane1.p3.x + vec.x, y: plane1.p3.y + vec.y };
        plane2.p4 = { x: plane1.p4.x + vec.x, y: plane1.p4.y + vec.y };


        let cuboidPoints;
        // right
        if (Math.abs(angle) < Math.PI / 2 - 0.1) {
            return DrawHandlerImpl.setupCuboidPoints(actualPoints);
        }

        // left
        if (Math.abs(angle) > Math.PI / 2 + 0.1) {
            return DrawHandlerImpl.setupCuboidPoints(actualPoints);
        }
        // down
        if (angle > 0) {
            cuboidPoints = [plane1.p1, plane2.p1, plane1.p2, plane2.p2, plane1.p3, plane2.p3];
            cuboidPoints[0].y += 0.1;
            cuboidPoints[4].y += 0.1;
            return [plane1.p1, plane2.p1, plane1.p2, plane2.p2, plane1.p3, plane2.p3];
        }
        // up
        cuboidPoints = [plane2.p1, plane1.p1, plane2.p2, plane1.p2, plane2.p3, plane1.p3];
        cuboidPoints[0].y += 0.1;
        cuboidPoints[4].y += 0.1;
        return cuboidPoints;
    }

    private drawCuboid(): void {
        this.drawInstance = (this.canvas as any).polyline()
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.drawPolyshape();
    }

    private pastePolyshape(): void {
        this.drawInstance.on('done', (e: CustomEvent): void => {
            const targetPoints = this.drawInstance
                .attr('points')
                .split(/[,\s]/g)
                .map((coord: string): number => +coord);

            const { points } = this.getFinalPolyshapeCoordinates(targetPoints);
            this.release();
            this.onDrawDone({
                shapeType: this.drawData.initialState.shapeType,
                objectType: this.drawData.initialState.objectType,
                points,
                occluded: this.drawData.initialState.occluded,
                attributes: { ...this.drawData.initialState.attributes },
                label: this.drawData.initialState.label,
                color: this.drawData.initialState.color,
            }, Date.now() - this.startTimestamp, e.detail.originalEvent.ctrlKey);
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
        this.drawInstance = (this.canvas as any).rect(box.width, box.height)
            .move(box.x, box.y)
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();

        this.drawInstance.on('done', (e: CustomEvent): void => {
            const bbox = this.drawInstance.node.getBBox();
            const [xtl, ytl, xbr, ybr] = this.getFinalRectCoordinates(bbox);
            this.release();
            this.onDrawDone({
                shapeType: this.drawData.initialState.shapeType,
                objectType: this.drawData.initialState.objectType,
                points: [xtl, ytl, xbr, ybr],
                occluded: this.drawData.initialState.occluded,
                attributes: { ...this.drawData.initialState.attributes },
                label: this.drawData.initialState.label,
                color: this.drawData.initialState.color,
            }, Date.now() - this.startTimestamp, e.detail.originalEvent.ctrlKey);
        });
    }


    private pastePolygon(points: string): void {
        this.drawInstance = (this.canvas as any).polygon(points)
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pastePolyline(points: string): void {
        this.drawInstance = (this.canvas as any).polyline(points)
            .addClass('cvat_canvas_shape_drawing').attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
        this.pasteShape();
        this.pastePolyshape();
    }

    private pastePoints(initialPoints: string): void {
        function moveShape(
            shape: SVG.PolyLine,
            group: SVG.G,
            x: number,
            y: number,
            scale: number,
        ): void {
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
        this.drawInstance = (this.canvas as any).polyline(initialPoints)
            .addClass('cvat_canvas_shape_drawing').style({
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

        moveShape(
            this.drawInstance, this.pointsGroup, initialX, initialY, this.geometry.scale,
        );

        this.canvas.on('mousemove.draw', (): void => {
            const { x, y } = this.cursorPosition; // was computer in another callback
            moveShape(
                this.drawInstance, this.pointsGroup, x, y, this.geometry.scale,
            );
        });

        this.pastePolyshape();
    }

    private setupPasteEvents(): void {
        let mouseX: number | null = null;
        let mouseY: number | null = null;

        this.canvas.on('mousedown.draw', (e: MouseEvent): void => {
            if (e.which === 1) {
                mouseX = e.clientX;
                mouseY = e.clientY;
            }
        });

        this.canvas.on('mouseup.draw', (e: MouseEvent): void => {
            const threshold = 10; // px
            if (e.which === 1) {
                if (Math.sqrt( // l2 distance < threshold
                    ((mouseX - e.clientX) ** 2)
                    + ((mouseY - e.clientY) ** 2),
                ) < threshold) {
                    this.drawInstance.fire('done', { originalEvent: e });
                }
            }
        });
    }

    private setupDrawEvents(): void {
        let initialized = false;
        let mouseX: number | null = null;
        let mouseY: number | null = null;

        this.canvas.on('mousedown.draw', (e: MouseEvent): void => {
            if (e.which === 1) {
                mouseX = e.clientX;
                mouseY = e.clientY;
            }
        });

        this.canvas.on('mouseup.draw', (e: MouseEvent): void => {
            const threshold = 10; // px
            if (e.which === 1) {
                if (Math.sqrt( // l2 distance < threshold
                    ((mouseX - e.clientX) ** 2)
                    + ((mouseY - e.clientY) ** 2),
                ) < threshold) {
                    if (!initialized) {
                        this.drawInstance.draw(e, { snapToGrid: 0.1 });
                        initialized = true;
                    } else {
                        this.drawInstance.draw(e);
                    }
                }
            }
        });
    }

    private startDraw(): void {
        // TODO: Use enums after typification cvat-core
        if (this.drawData.initialState) {
            const { offset } = this.geometry;
            if (this.drawData.shapeType === 'rectangle') {
                const [xtl, ytl, xbr, ybr] = this.drawData.initialState.points
                    .map((coord: number): number => coord + offset);

                this.pasteBox({
                    x: xtl,
                    y: ytl,
                    width: xbr - xtl,
                    height: ybr - ytl,
                });
            } else {
                const points = this.drawData.initialState.points
                    .map((coord: number): number => coord + offset);
                const stringifiedPoints = pointsToString(points);

                if (this.drawData.shapeType === 'polygon') {
                    this.pastePolygon(stringifiedPoints);
                } else if (this.drawData.shapeType === 'polyline') {
                    this.pastePolyline(stringifiedPoints);
                } else if (this.drawData.shapeType === 'points') {
                    this.pastePoints(stringifiedPoints);
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
                this.drawCuboid();
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
    ) {
        this.startTimestamp = Date.now();
        this.onDrawDone = onDrawDone;
        this.canvas = canvas;
        this.text = text;
        this.initialized = false;
        this.drawData = null;
        this.geometry = null;
        this.crosshair = null;
        this.drawInstance = null;
        this.pointsGroup = null;
        this.cursorPosition = {
            x: 0,
            y: 0,
        };

        this.canvas.on('mousemove.crosshair', (e: MouseEvent): void => {
            const [x, y] = translateToSVG(
                this.canvas.node as any as SVGSVGElement,
                [e.clientX, e.clientY],
            );
            this.cursorPosition = { x, y };
            if (this.crosshair) {
                this.crosshair.x.attr({ y1: y, y2: y });
                this.crosshair.y.attr({ x1: x, x2: x });
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
                point.attr(
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
            this.cancel();
            this.drawData = drawData;
        }
    }

    public cancel(): void {
        this.release();
        this.onDrawDone(null);
    }
}
