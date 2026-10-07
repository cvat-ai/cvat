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
    readPointsFromShape,
    translateToCanvas,
    computeWrappingBox,
    makeSVGFromTemplate,
    setupSkeletonEdges,
    translateFromCanvas,
    DrawnState,
    applySnapToShapePoint,
} from './shared';
import Crosshair from './crosshair';
import consts from './consts';
import {
    DrawData, Geometry, RectDrawingMethod, Configuration, CuboidDrawingMethod,
} from './canvasModel';
import { cuboidFrom4Points } from './cuboid';
import {
    FinalCoordinates,
    checkPasteConstraint as checkConstraint,
    finalizePastedShapePoints,
    getFinalCuboidCoordinates,
    getFinalEllipseCoordinates,
    getFinalPolyshapeCoordinates,
    getFinalRectCoordinates,
} from './paste';
import {
    fitRotatedShape,
    fitRotatedPreviewFromGuide,
    getClosestEquivalentFit,
    interpolateRotatedShapeFit,
    MIN_FITTED_ELLIPSE_POINTS,
    needsAnotherFitAnimationFrame,
    RotatedShapeFit,
    RotatedShapeTopEdge,
    withTopEdge,
} from './rotatedShapeFitter';

export interface DrawHandler {
    configure(configuration: Configuration): void;
    draw(drawData: DrawData, geometry: Geometry): void;
    transform(geometry: Geometry): void;
    cancel(): void;
}

interface RotatedShapePreviewState {
    svg: SVG.G | null;
    animationFrame: number | null;
    pendingPoints: number[] | null;
    displayedFit: RotatedShapeFit | null;
    targetFit: RotatedShapeFit | null;
    topEdgeReference: RotatedShapeTopEdge | null;
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
    private configuration: Configuration;
    private autoborderHandler: AutoborderHandler;
    private autobordersEnabled: boolean;
    private controlPointsSize: number;
    private selectedShapeOpacity: number;
    private outlinedBorders: string;
    private isHidden: boolean;
    private getDrawnStates: (() => Record<number, DrawnState>) | null;
    private isCtrlKeyDown: (() => boolean) | null;

    // we should use any instead of SVG.Shape because svg plugins cannot change declared interface
    // so, methods like draw() just undefined for SVG.Shape, but nevertheless they exist
    private drawInstance: any;
    private initialized: boolean;
    private canceled: boolean;
    private pointsGroup: SVG.G | null;
    private shapeSizeElement: ShapeSizeElement | null;
    private controlPointsAnimationFrame: number | null;
    private rotatedShapePreview: RotatedShapePreviewState;

    private usesEllipseFit(): boolean {
        return this.drawData.shapeType === 'ellipse' &&
            this.drawData.rectDrawingMethod === RectDrawingMethod.ROTATED_POINTS;
    }

    private fitRotatedShape(points: number[]): RotatedShapeFit | null {
        const preview = this.rotatedShapePreview;
        const fitted = fitRotatedShape(points, {
            fitter: this.drawData.rotatedShapeFitter,
            useEllipseFit: this.usesEllipseFit(),
            previousTopEdge: preview.topEdgeReference,
            scale: this.geometry.scale,
        });

        if (fitted?.topEdge) {
            preview.topEdgeReference = fitted.topEdge;
        }

        return fitted;
    }

    private fitRotatedPreview(points: number[]): RotatedShapeFit | null {
        if (this.usesEllipseFit()) {
            return points.length >= MIN_FITTED_ELLIPSE_POINTS * 2 ? this.fitRotatedShape(points) : null;
        }

        return points.length > 6 ? this.fitRotatedShape(points) : fitRotatedPreviewFromGuide(points);
    }

    private updateFitPreview(fitted: RotatedShapeFit | null): void {
        const preview = this.rotatedShapePreview;
        if (!fitted || fitted.size.width < consts.SIZE_THRESHOLD || fitted.size.height < consts.SIZE_THRESHOLD) {
            if (preview.svg) {
                preview.svg.remove();
                preview.svg = null;
            }
            return;
        }

        const previewAttributes = {
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'stroke-dasharray': `${6 / this.geometry.scale} ${4 / this.geometry.scale}`,
            'pointer-events': 'none',
            fill: 'none',
            stroke: this.outlinedBorders,
        };

        if (!preview.svg) {
            preview.svg = this.canvas.group().attr({ 'pointer-events': 'none' });
            preview.svg.rect().attr(previewAttributes);
            if (this.drawData.shapeType === 'ellipse') {
                preview.svg.ellipse().attr(previewAttributes);
            }
            preview.svg.circle().attr(previewAttributes);
        }

        preview.svg.untransform();
        const [rectanglePreview, ...remainingPreviews] = preview.svg.children();
        const ellipsePreview = this.drawData.shapeType === 'ellipse' ? remainingPreviews[0] : null;
        const rotationPreview = this.drawData.shapeType === 'ellipse' ? remainingPreviews[1] : remainingPreviews[0];
        rectanglePreview.attr({
            ...previewAttributes,
            x: fitted.center.x - fitted.size.width / 2,
            y: fitted.center.y - fitted.size.height / 2,
            width: fitted.size.width,
            height: fitted.size.height,
            fill: 'white',
            'fill-opacity': 0.1,
            stroke: 'black',
            'stroke-dasharray': this.drawData.shapeType === 'ellipse' ? previewAttributes['stroke-dasharray'] : 'none',
            'stroke-opacity': 1,
        });
        if (ellipsePreview) {
            ellipsePreview.attr({
                ...previewAttributes,
                cx: fitted.center.x,
                cy: fitted.center.y,
                rx: fitted.size.width / 2,
                ry: fitted.size.height / 2,
                'stroke-dasharray': 'none',
            });
        }
        const topEdge = fitted.topEdge || withTopEdge(fitted).topEdge;
        const normalLength = Math.hypot(topEdge.normal.x, topEdge.normal.y);
        const rotationPointOffset = (2 * this.controlPointsSize + 5) / this.geometry.scale;
        const rotationPoint = {
            x: topEdge.point.x + (topEdge.normal.x / normalLength) * rotationPointOffset,
            y: topEdge.point.y + (topEdge.normal.y / normalLength) * rotationPointOffset,
        };
        const angleRadians = (fitted.angle * Math.PI) / 180;
        const relativeX = rotationPoint.x - fitted.center.x;
        const relativeY = rotationPoint.y - fitted.center.y;
        rotationPreview.attr({
            // The rectangle preview can use a 90-degree equivalent orientation to
            // smooth its motion. Transform the semantic top-edge marker into that
            // local coordinate system before the group itself is rotated.
            cx: fitted.center.x + relativeX * Math.cos(angleRadians) + relativeY * Math.sin(angleRadians),
            cy: fitted.center.y - relativeX * Math.sin(angleRadians) + relativeY * Math.cos(angleRadians),
            r: this.controlPointsSize / this.geometry.scale,
            fill: 'white',
            stroke: CIRCLE_STROKE,
            'stroke-width': consts.POINTS_STROKE_WIDTH / this.geometry.scale,
            'stroke-dasharray': 'none',
            'pointer-events': 'none',
        });
        preview.svg.rotate(fitted.angle, fitted.center.x, fitted.center.y);
    }

    private renderFitPreview(): void {
        const preview = this.rotatedShapePreview;
        preview.animationFrame = null;
        const { pendingPoints } = preview;
        if (pendingPoints) {
            const fitted = this.fitRotatedPreview(pendingPoints);
            const hasEnoughPointsForEllipse = this.usesEllipseFit() &&
                pendingPoints.length >= MIN_FITTED_ELLIPSE_POINTS * 2;

            preview.targetFit = fitted || (hasEnoughPointsForEllipse ?
                preview.targetFit || preview.displayedFit : null);
            preview.pendingPoints = null;
        }

        if (!preview.targetFit) {
            preview.displayedFit = null;
            this.updateFitPreview(null);
            return;
        }

        const targetFit = preview.displayedFit ?
            getClosestEquivalentFit(preview.targetFit, preview.displayedFit) : preview.targetFit;
        const isExpandingFromLine = preview.displayedFit &&
            Math.min(
                preview.displayedFit.size.width,
                preview.displayedFit.size.height,
            ) < consts.SIZE_THRESHOLD;
        let smoothingFactor = 0.1;
        let topEdgeSmoothingFactor = 0.06;
        if (isExpandingFromLine) {
            smoothingFactor = 0.02;
            topEdgeSmoothingFactor = 0.02;
        } else if (this.usesEllipseFit()) {
            smoothingFactor = 0.2;
            topEdgeSmoothingFactor = 0.12;
        }
        const nextFit = preview.displayedFit ? interpolateRotatedShapeFit(
            preview.displayedFit,
            targetFit,
            smoothingFactor,
            topEdgeSmoothingFactor,
        ) : targetFit;

        preview.displayedFit = nextFit;
        preview.targetFit = targetFit;
        this.updateFitPreview(nextFit);

        if (needsAnotherFitAnimationFrame(targetFit, nextFit)) {
            preview.animationFrame = window.requestAnimationFrame((): void => this.renderFitPreview());
        }
    }

    private scheduleFitPreview(points: number[]): void {
        const preview = this.rotatedShapePreview;
        preview.pendingPoints = points;
        if (preview.animationFrame !== null) {
            return;
        }

        preview.animationFrame = window.requestAnimationFrame((): void => this.renderFitPreview());
    }

    private resizeDrawControlPoints(): void {
        if (!this.drawInstance) {
            return;
        }

        const paintHandler = this.drawInstance.remember('_paintHandler');
        if (paintHandler) {
            for (const point of (paintHandler as any).set.members) {
                this.strokePoint(point);
                point.attr('stroke-width', `${consts.POINTS_STROKE_WIDTH / this.geometry.scale}`);
                point.attr('r', `${this.controlPointsSize / this.geometry.scale}`);
            }
        }
    }

    private scheduleDrawControlPointsResize(): void {
        if (this.controlPointsAnimationFrame !== null) {
            return;
        }

        this.controlPointsAnimationFrame = window.requestAnimationFrame((): void => {
            this.controlPointsAnimationFrame = null;
            this.resizeDrawControlPoints();
        });
    }

    private getFinalEllipseCoordinates(points: number[], fitIntoFrame: boolean): number[] {
        return getFinalEllipseCoordinates(points, fitIntoFrame, this.geometry);
    }

    private getFinalRectCoordinates(points: number[], fitIntoFrame: boolean): number[] {
        return getFinalRectCoordinates(points, fitIntoFrame, this.geometry);
    }

    private getFinalPolyshapeCoordinates(targetPoints: number[], fitIntoFrame: boolean): FinalCoordinates {
        return getFinalPolyshapeCoordinates(
            targetPoints,
            fitIntoFrame,
            this.drawData.shapeType,
            this.geometry,
        );
    }

    private getFinalCuboidCoordinates(targetPoints: number[]): FinalCoordinates {
        return getFinalCuboidCoordinates(targetPoints, this.geometry);
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
                this.drawData.rectDrawingMethod === RectDrawingMethod.ROTATED_POINTS ||
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

        if (this.rotatedShapePreview.svg) {
            this.rotatedShapePreview.svg.remove();
            this.rotatedShapePreview.svg = null;
        }

        if (this.rotatedShapePreview.animationFrame !== null) {
            window.cancelAnimationFrame(this.rotatedShapePreview.animationFrame);
            this.rotatedShapePreview.animationFrame = null;
        }
        if (this.controlPointsAnimationFrame !== null) {
            window.cancelAnimationFrame(this.controlPointsAnimationFrame);
            this.controlPointsAnimationFrame = null;
        }
        this.rotatedShapePreview.pendingPoints = null;
        this.rotatedShapePreview.displayedFit = null;
        this.rotatedShapePreview.targetFit = null;
        this.rotatedShapePreview.topEdgeReference = null;

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

    private drawRotatedShapeByPoints(): void {
        let placedPoints = 0;
        this.drawInstance = (this.canvas as any)
            .polygon()
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'stroke-dasharray': `${3 / this.geometry.scale} ${3 / this.geometry.scale}`,
                'fill-opacity': 0,
                stroke: this.outlinedBorders,
            });

        const updatePreview = (shape: SVG.Shape): void => {
            const points = readPointsFromShape(shape);
            const shouldShowEllipsePreview = this.drawData.shapeType !== 'ellipse' || placedPoints >= 5;
            this.scheduleFitPreview(shouldShowEllipsePreview ? points : []);
            this.scheduleDrawControlPointsResize();
        };

        this.drawInstance
            .on('drawstart', (e: CustomEvent): void => {
                placedPoints = 1;
                updatePreview((e.target as any as { instance: SVG.Shape }).instance);
            })
            .on('drawpoint', (e: CustomEvent): void => {
                placedPoints += 1;
                updatePreview((e.target as any as { instance: SVG.Shape }).instance);
            })
            .on('drawupdate', (e: CustomEvent): void => {
                updatePreview((e.target as any as { instance: SVG.Shape }).instance);
            })
            .on('undopoint', (e: CustomEvent): void => {
                placedPoints = Math.max(1, placedPoints - 1);
                updatePreview((e.target as any as { instance: SVG.Shape }).instance);
            })
            .on('drawdone', (e: CustomEvent): void => {
                const fitted = this.fitRotatedShape(
                    readPointsFromShape((e.target as any as { instance: SVG.Shape }).instance),
                );
                const { shapeType, redraw: clientID } = this.drawData;

                if (this.canceled || !fitted ||
                    fitted.size.width < consts.SIZE_THRESHOLD || fitted.size.height < consts.SIZE_THRESHOLD) {
                    this.release();
                    this.onDrawDone(null);
                    return;
                }

                const box = [
                    fitted.center.x - fitted.size.width / 2,
                    fitted.center.y - fitted.size.height / 2,
                    fitted.center.x + fitted.size.width / 2,
                    fitted.center.y + fitted.size.height / 2,
                ];
                const points = shapeType === 'ellipse' ?
                    this.getFinalEllipseCoordinates([
                        fitted.center.x,
                        fitted.center.y,
                        fitted.center.x + fitted.size.width / 2,
                        fitted.center.y - fitted.size.height / 2,
                    ], false) :
                    this.getFinalRectCoordinates(box, false);

                this.release();
                if (checkConstraint(shapeType, points)) {
                    this.onDrawDone({
                        clientID,
                        shapeType,
                        points,
                        rotation: fitted.angle,
                    }, Date.now() - this.startTimestamp);
                } else {
                    this.onDrawDone(null);
                }
            });

        // Undoing a point is provided by the same right-click interaction as polygons.
        this.canvas.on('mousedown.draw', (e: MouseEvent): void => {
            if (e.button === 2) {
                e.stopPropagation();
                e.preventDefault();
                this.drawInstance.draw('undo');
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
        const snapToPoint = (pointIndex: number): void => {
            if (
                !this.configuration.snapToPoint ||
                this.isCtrlKeyDown() ||
                !['polygon', 'polyline'].includes(this.drawData.shapeType) ||
                !this.getDrawnStates
            ) {
                return;
            }

            const pointsArray = (this.drawInstance as any).array().valueOf();
            if (!pointsArray.length || pointIndex < 0 || pointIndex >= pointsArray.length) {
                return;
            }

            applySnapToShapePoint(
                this.drawInstance,
                pointIndex,
                this.getDrawnStates(),
                this.geometry.offset,
                this.configuration.snapRadius / this.geometry.scale,
                this.drawData.redraw,
            );
        };

        const sizeDecrement = (): void => {
            if (--size === 0) {
                // we need additional settimeout because we cannot invoke draw('done')
                // from event listener for drawstart event
                // because of implementation of svg.js
                setTimeout((): void => this.drawInstance.draw('done'));
            }
        };

        this.drawInstance.on('drawstart', () => {
            sizeDecrement();
            snapToPoint(0);
        });
        this.drawInstance.on('drawpoint', sizeDecrement);
        this.drawInstance.on('drawupdate', (): void => {
            this.transform(this.geometry);
            snapToPoint((this.drawInstance as any).array().valueOf().length - 1);
        });
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
            const slidingEnabled = e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
            if (slidingEnabled && ['polygon', 'polyline'].includes(this.drawData.shapeType)) {
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
            const { shapeType, redraw: clientID, simplifyPoly } = this.drawData;
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

                this.onDrawDone({
                    clientID, shapeType, points, simplifyPoly,
                }, Date.now() - this.startTimestamp);
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

                this.pointsGroup.node.replaceChildren(...this.drawData.skeletonSVG.cloneNode(true).childNodes);
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
            const points = finalizePastedShapePoints(
                shapeType,
                targetPoints,
                this.drawData.initialState.rotation,
                this.geometry,
            );

            if (points) {
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
            const finalPoints = finalizePastedShapePoints(
                'rectangle',
                points,
                this.drawData.initialState.rotation,
                this.geometry,
            );
            if (finalPoints) {
                this.onDrawDone(
                    {
                        shapeType: this.drawData.initialState.shapeType,
                        objectType: this.drawData.initialState.objectType,
                        points: finalPoints,
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
            const points = finalizePastedShapePoints(
                'ellipse',
                readPointsFromShape((e.target as any as { instance: SVG.Ellipse }).instance),
                this.drawData.initialState.rotation,
                this.geometry,
            );
            if (points) {
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
                if (this.drawData.rectDrawingMethod === RectDrawingMethod.ROTATED_POINTS) {
                    this.drawRotatedShapeByPoints();
                } else if (this.drawData.rectDrawingMethod === RectDrawingMethod.EXTREME_POINTS) {
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
                if (this.drawData.rectDrawingMethod === RectDrawingMethod.ROTATED_POINTS) {
                    this.drawRotatedShapeByPoints();
                } else {
                    this.drawEllipse();
                    this.shapeSizeElement = displayShapeSize(this.canvas, this.text);
                }
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

            if (this.drawData.shapeType !== 'ellipse' ||
                this.drawData.rectDrawingMethod === RectDrawingMethod.ROTATED_POINTS) {
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
        getDrawnStates: () => Record<number, DrawnState>,
        isCtrlKeyDown: () => boolean,
    ) {
        this.autoborderHandler = autoborderHandler;
        this.configuration = configuration;
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
        this.controlPointsAnimationFrame = null;
        this.rotatedShapePreview = {
            svg: null,
            animationFrame: null,
            pendingPoints: null,
            displayedFit: null,
            targetFit: null,
            topEdgeReference: null,
        };
        this.getDrawnStates = getDrawnStates;
        this.isCtrlKeyDown = isCtrlKeyDown;
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

    private updateHidden(value: boolean): void {
        this.isHidden = value;

        if (value) {
            this.canvas.attr('pointer-events', 'none');
        } else {
            this.canvas.attr('pointer-events', 'all');
        }
    }

    public configure(configuration: Configuration): void {
        this.configuration = configuration;
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

        if (this.drawInstance && isFilalblePolygon) {
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
            this.drawInstance.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
            });
            this.resizeDrawControlPoints();
        }

        if (this.rotatedShapePreview.svg) {
            this.rotatedShapePreview.svg.children().forEach((preview: SVG.Element): void => {
                preview.attr({
                    'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
                    'stroke-dasharray': `${6 / geometry.scale} ${4 / geometry.scale}`,
                });
            });
            if (this.rotatedShapePreview.displayedFit) {
                this.updateFitPreview(this.rotatedShapePreview.displayedFit);
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
