// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import 'svg.select.js';

import consts from './consts';
import { translateFromSVG, pointsToNumberArray } from './shared';
import { PolyEditData, Geometry, Configuration } from './canvasModel';
import { AutoborderHandler } from './autoborderHandler';

export interface EditHandler {
    edit(editData: PolyEditData): void;
    transform(geometry: Geometry): void;
    configurate(configuration: Configuration): void;
    cancel(): void;
}

export class EditHandlerImpl implements EditHandler {
    private onEditDone: (state: any, points: number[]) => void;
    private autoborderHandler: AutoborderHandler;
    private geometry: Geometry | null;
    private canvas: SVG.Container;
    private editData: PolyEditData | null;
    private editedShape: SVG.Shape | null;
    private editLine: SVG.PolyLine | null;
    private clones: SVG.Polygon[];
    private controlPointsSize: number;
    private autobordersEnabled: boolean;
    private intelligentCutEnabled: boolean;
    private outlinedBorders: string;

    private setupTrailingPoint(circle: SVG.Circle): void {
        const head = this.editedShape.attr('points').split(' ').slice(0, this.editData.pointID).join(' ');
        circle.on('mouseenter', (): void => {
            circle.attr({
                'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / this.geometry.scale,
            });
        });

        circle.on('mouseleave', (): void => {
            circle.attr({
                'stroke-width': consts.POINTS_STROKE_WIDTH / this.geometry.scale,
            });
        });

        const minimumPoints = 2;
        circle.on('mousedown', (e: MouseEvent): void => {
            if (e.button !== 0) return;
            const { offset } = this.geometry;
            const stringifiedPoints = `${head} ${this.editLine.node.getAttribute('points').slice(0, -2)}`;
            const points = pointsToNumberArray(stringifiedPoints)
                .slice(0, -2)
                .map((coord: number): number => coord - offset);

            if (points.length >= minimumPoints * 2) {
                const { state } = this.editData;
                this.edit({
                    enabled: false,
                });
                this.onEditDone(state, points);
            }
        });
    }

    private startEdit(): void {
        // get started coordinates
        const [clientX, clientY] = translateFromSVG(
            (this.canvas.node as any) as SVGSVGElement,
            this.editedShape.attr('points').split(' ')[this.editData.pointID].split(','),
        );

        // generate mouse event
        const dummyEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
        });

        // Add ability to edit shapes by sliding
        // We need to remember last drawn point
        // to implementation of slide drawing
        const lastDrawnPoint: {
            x: number;
            y: number;
        } = {
            x: null,
            y: null,
        };

        this.canvas.on('mousemove.edit', (e: MouseEvent): void => {
            if (e.shiftKey && ['polygon', 'polyline'].includes(this.editData.state.shapeType)) {
                if (lastDrawnPoint.x === null || lastDrawnPoint.y === null) {
                    (this.editLine as any).draw('point', e);
                } else {
                    const deltaThreshold = 15;
                    const dxsqr = (e.clientX - lastDrawnPoint.x) ** 2;
                    const dysqr = (e.clientY - lastDrawnPoint.y) ** 2;
                    const delta = Math.sqrt(dxsqr + dysqr);
                    if (delta > deltaThreshold) {
                        (this.editLine as any).draw('point', e);
                    }
                }
            }
        });

        this.editLine = (this.canvas as any).polyline();
        if (this.editData.state.shapeType === 'polyline') {
            (this.editLine as any).on('drawupdate', (e: CustomEvent): void => {
                const circle = (e.target as any).instance.remember('_paintHandler').set.last();
                if (circle) this.setupTrailingPoint(circle);
            });
        }

        (this.editLine as any)
            .addClass('cvat_canvas_shape_drawing')
            .style({
                'pointer-events': 'none',
                'fill-opacity': 0,
            })
            .attr({
                'data-origin-client-id': this.editData.state.clientID,
                stroke: this.editedShape.attr('stroke'),
            })
            .on('drawstart drawpoint', (e: CustomEvent): void => {
                this.transform(this.geometry);
                lastDrawnPoint.x = e.detail.event.clientX;
                lastDrawnPoint.y = e.detail.event.clientY;
            })
            .on('drawupdate', (): void => this.transform(this.geometry))
            .draw(dummyEvent, { snapToGrid: 0.1 });

        if (this.editData.state.shapeType === 'points') {
            this.editLine.attr('stroke-width', 0);
            (this.editLine as any).draw('undo');
        }

        this.setupEditEvents();
        if (this.autobordersEnabled) {
            this.autoborderHandler.autoborder(true, this.editLine, this.editData.state.clientID);
        }
    }

    private setupEditEvents(): void {
        this.canvas.on('mousedown.edit', (e: MouseEvent): void => {
            if (e.button === 0 && !e.altKey) {
                (this.editLine as any).draw('point', e);
            } else if (e.button === 2 && this.editLine) {
                if (this.editData.state.shapeType === 'points' || this.editLine.attr('points').split(' ').length > 2) {
                    (this.editLine as any).draw('undo');
                }
            }
        });
    }

    private selectPolygon(shape: SVG.Polygon): void {
        const { offset } = this.geometry;
        const points = pointsToNumberArray(shape.attr('points')).map((coord: number): number => coord - offset);

        const { state } = this.editData;
        this.edit({
            enabled: false,
        });
        this.onEditDone(state, points);
    }

    private stopEdit(e: MouseEvent): void {
        if (!this.editLine) {
            return;
        }

        // Get stop point and all points
        const stopPointID = Array.prototype.indexOf.call((e.target as HTMLElement).parentElement.children, e.target);
        const oldPoints = this.editedShape.attr('points').trim().split(' ');
        const linePoints = this.editLine.attr('points').trim().split(' ');

        if (this.editLine.attr('points') === '0,0') {
            this.cancel();
            return;
        }

        // Compute new point array
        const [start, stop] = [this.editData.pointID, stopPointID].sort((a, b): number => +a - +b);

        if (this.editData.state.shapeType !== 'polygon') {
            let points = null;
            const { offset } = this.geometry;

            if (this.editData.state.shapeType === 'polyline') {
                if (start !== this.editData.pointID) {
                    linePoints.reverse();
                }
                points = oldPoints
                    .slice(0, start)
                    .concat(linePoints)
                    .concat(oldPoints.slice(stop + 1));
            } else {
                points = oldPoints.concat(linePoints.slice(0, -1));
            }

            points = pointsToNumberArray(points.join(' ')).map((coord: number): number => coord - offset);

            const { state } = this.editData;
            this.edit({
                enabled: false,
            });
            this.onEditDone(state, points);

            return;
        }

        const cutIndexes1 = oldPoints.reduce(
            (acc: number[], _: string, i: number): number[] => (i >= stop || i <= start ? [...acc, i] : acc),
            [],
        );
        const cutIndexes2 = oldPoints.reduce(
            (acc: number[], _: string, i: number): number[] => (i <= stop && i >= start ? [...acc, i] : acc),
            [],
        );

        const curveLength = (indexes: number[]): number => {
            const points = indexes
                .map((index: number): string => oldPoints[index])
                .map((point: string): string[] => point.split(','))
                .map((point: string[]): number[] => [+point[0], +point[1]]);
            let length = 0;
            for (let i = 1; i < points.length; i++) {
                const dxsqr = (points[i][0] - points[i - 1][0]) ** 2;
                const dysqr = (points[i][1] - points[i - 1][1]) ** 2;
                length += Math.sqrt(dxsqr + dysqr);
            }

            return length;
        };

        const pointsCriteria = cutIndexes1.length > cutIndexes2.length;
        const lengthCriteria = curveLength(cutIndexes1) > curveLength(cutIndexes2);

        if (start !== this.editData.pointID) {
            linePoints.reverse();
        }

        const firstPart = oldPoints
            .slice(0, start)
            .concat(linePoints)
            .concat(oldPoints.slice(stop + 1));
        const secondPart = oldPoints.slice(start, stop).concat(linePoints.slice(1).reverse());

        if (firstPart.length < 3 || secondPart.length < 3) {
            this.cancel();
            return;
        }

        // We do not need these events any more
        this.canvas.off('mousedown.edit');
        this.canvas.off('mousemove.edit');

        (this.editLine as any).draw('stop');
        this.editLine.remove();
        this.editLine = null;

        if (pointsCriteria && lengthCriteria && this.intelligentCutEnabled) {
            this.clones.push(this.canvas.polygon(firstPart.join(' ')));
            this.selectPolygon(this.clones[0]);
            // left indexes1 and
        } else if (!pointsCriteria && !lengthCriteria && this.intelligentCutEnabled) {
            this.clones.push(this.canvas.polygon(secondPart.join(' ')));
            this.selectPolygon(this.clones[0]);
        } else {
            for (const points of [firstPart, secondPart]) {
                this.clones.push(
                    this.canvas
                        .polygon(points.join(' '))
                        .attr('fill', this.editedShape.attr('fill'))
                        .attr('fill-opacity', '0.5')
                        .addClass('cvat_canvas_shape'),
                );
            }

            for (const clone of this.clones) {
                clone.on('click', (): void => this.selectPolygon(clone));
                clone
                    .on('mouseenter', (): void => {
                        clone.addClass('cvat_canvas_shape_splitting');
                    })
                    .on('mouseleave', (): void => {
                        clone.removeClass('cvat_canvas_shape_splitting');
                    });
            }
        }
    }

    private setupPoints(enabled: boolean): void {
        const stopEdit = this.stopEdit.bind(this);
        const getGeometry = (): Geometry => this.geometry;
        const fill = this.editedShape.attr('fill') || 'inherit';

        if (enabled) {
            (this.editedShape as any).selectize(true, {
                deepSelect: true,
                pointSize: (2 * this.controlPointsSize) / getGeometry().scale,
                rotationPoint: false,
                pointType(cx: number, cy: number): SVG.Circle {
                    const circle: SVG.Circle = this.nested
                        .circle(this.options.pointSize)
                        .stroke('black')
                        .fill(fill)
                        .center(cx, cy)
                        .attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / getGeometry().scale,
                        });

                    circle.node.addEventListener('mouseenter', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / getGeometry().scale,
                        });

                        circle.node.addEventListener('click', stopEdit);
                        circle.addClass('cvat_canvas_selected_point');
                    });

                    circle.node.addEventListener('mouseleave', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / getGeometry().scale,
                        });

                        circle.node.removeEventListener('click', stopEdit);
                        circle.removeClass('cvat_canvas_selected_point');
                    });

                    return circle;
                },
            });
        } else {
            (this.editedShape as any).selectize(false, {
                deepSelect: true,
            });
        }
    }

    private release(): void {
        this.canvas.off('mousedown.edit');
        this.canvas.off('mousemove.edit');
        this.autoborderHandler.autoborder(false);

        if (this.editedShape) {
            this.setupPoints(false);
            this.editedShape.remove();
            this.editedShape = null;
        }

        if (this.editLine) {
            (this.editLine as any).draw('stop');
            this.editLine.remove();
            this.editLine = null;
        }

        if (this.clones.length) {
            for (const clone of this.clones) {
                clone.remove();
            }
            this.clones = [];
        }
    }

    private initEditing(): void {
        this.editedShape = this.canvas
            .select(`#cvat_canvas_shape_${this.editData.state.clientID}`).first()
            .clone().attr('stroke', this.outlinedBorders);
        this.setupPoints(true);
        this.startEdit();
        // draw points for this with selected and start editing till another point is clicked
        // click one of two parts to remove (in case of polygon only)

        // else we can start draw polyline
        // after we have got shape and points, we are waiting for second point pressed on this shape
    }

    private closeEditing(): void {
        this.release();
    }

    public constructor(
        onEditDone: EditHandlerImpl['onEditDone'],
        canvas: SVG.Container,
        autoborderHandler: AutoborderHandler,
    ) {
        this.autoborderHandler = autoborderHandler;
        this.autobordersEnabled = false;
        this.intelligentCutEnabled = false;
        this.controlPointsSize = consts.BASE_POINT_SIZE;
        this.outlinedBorders = 'black';
        this.onEditDone = onEditDone;
        this.canvas = canvas;
        this.editData = null;
        this.editedShape = null;
        this.editLine = null;
        this.geometry = null;
        this.clones = [];
    }

    public edit(editData: any): void {
        if (editData.enabled) {
            if (editData.state.shapeType !== 'rectangle') {
                this.editData = editData;
                this.initEditing();
            } else {
                this.cancel();
            }
        } else {
            this.closeEditing();
            this.editData = editData;
        }
    }

    public cancel(): void {
        this.release();
        this.onEditDone(null, null);
    }

    public configurate(configuration: Configuration): void {
        this.autobordersEnabled = configuration.autoborders;
        this.outlinedBorders = configuration.outlinedBorders || 'black';

        if (this.editedShape) {
            this.editedShape.attr('stroke', this.outlinedBorders);
        }

        if (this.editLine) {
            this.editLine.attr('stroke', this.outlinedBorders);
            if (this.autobordersEnabled) {
                this.autoborderHandler.autoborder(true, this.editLine, this.editData.state.clientID);
            } else {
                this.autoborderHandler.autoborder(false);
            }
        }
        this.controlPointsSize = configuration.controlPointsSize || consts.BASE_POINT_SIZE;
        this.intelligentCutEnabled = configuration.intelligentPolygonCrop;
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;

        if (this.editedShape) {
            this.editedShape.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
            });
        }

        if (this.editLine) {
            (this.editLine as any).draw('transform');
            if (this.editData.state.shapeType !== 'points') {
                this.editLine.attr({
                    'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
                });
            }

            const paintHandler = this.editLine.remember('_paintHandler');

            for (const point of (paintHandler as any).set.members) {
                point.attr('stroke-width', `${consts.POINTS_STROKE_WIDTH / geometry.scale}`);
                point.attr('r', `${this.controlPointsSize / geometry.scale}`);
            }
        }
    }
}
