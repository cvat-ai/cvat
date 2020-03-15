// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import 'svg.select.js';

import consts from './consts';
import {
    translateFromSVG,
    pointsToArray,
} from './shared';
import {
    EditData,
    Geometry,
} from './canvasModel';

export interface EditHandler {
    edit(editData: EditData): void;
    transform(geometry: Geometry): void;
    cancel(): void;
}

export class EditHandlerImpl implements EditHandler {
    private onEditDone: (state: any, points: number[]) => void;
    private geometry: Geometry;
    private canvas: SVG.Container;
    private editData: EditData;
    private editedShape: SVG.Shape;
    private editLine: SVG.PolyLine;
    private clones: SVG.Polygon[];

    private startEdit(): void {
        // get started coordinates
        const [clientX, clientY] = translateFromSVG(
            this.canvas.node as any as SVGSVGElement,
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
                    const deltaTreshold = 15;
                    const delta = Math.sqrt(
                        ((e.clientX - lastDrawnPoint.x) ** 2)
                        + ((e.clientY - lastDrawnPoint.y) ** 2),
                    );
                    if (delta > deltaTreshold) {
                        (this.editLine as any).draw('point', e);
                    }
                }
            }
        });

        this.editLine = (this.canvas as any).polyline();
        (this.editLine as any).addClass('cvat_canvas_shape_drawing').style({
            'pointer-events': 'none',
            'fill-opacity': 0,
        }).on('drawstart drawpoint', (e: CustomEvent): void => {
            this.transform(this.geometry);
            lastDrawnPoint.x = e.detail.event.clientX;
            lastDrawnPoint.y = e.detail.event.clientY;
        }).draw(dummyEvent, { snapToGrid: 0.1 });

        if (this.editData.state.shapeType === 'points') {
            this.editLine.attr('stroke-width', 0);
            (this.editLine as any).draw('undo');
        }

        this.setupEditEvents();
    }

    private setupEditEvents(): void {
        let mouseX: number | null = null;
        let mouseY: number | null = null;

        this.canvas.on('mousedown.edit', (e: MouseEvent): void => {
            if (e.which === 1) {
                mouseX = e.clientX;
                mouseY = e.clientY;
            }
        });

        this.canvas.on('mouseup.edit', (e: MouseEvent): void => {
            const threshold = 10; // px
            if (e.which === 1) {
                if (Math.sqrt( // l2 distance < threshold
                    ((mouseX - e.clientX) ** 2)
                    + ((mouseY - e.clientY) ** 2),
                ) < threshold) {
                    (this.editLine as any).draw('point', e);
                }
            }
        });
    }

    private selectPolygon(shape: SVG.Polygon): void {
        const { offset } = this.geometry;
        const points = pointsToArray(shape.attr('points'))
            .map((coord: number): number => coord - offset);

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
        const stopPointID = Array.prototype.indexOf
            .call((e.target as HTMLElement).parentElement.children, e.target);
        const oldPoints = this.editedShape.attr('points').trim().split(' ');
        const linePoints = this.editLine.attr('points').trim().split(' ');

        if (this.editLine.attr('points') === '0,0') {
            this.cancel();
            return;
        }

        // Compute new point array
        const [start, stop] = [this.editData.pointID, stopPointID]
            .sort((a, b): number => +a - +b);

        if (this.editData.state.shapeType === 'polygon') {
            if (start !== this.editData.pointID) {
                linePoints.reverse();
            }

            const firstPart = oldPoints.slice(0, start)
                .concat(linePoints)
                .concat(oldPoints.slice(stop + 1));

            linePoints.reverse();
            const secondPart = oldPoints.slice(start + 1, stop)
                .concat(linePoints);

            if (firstPart.length < 3 || secondPart.length < 3) {
                this.cancel();
                return;
            }

            for (const points of [firstPart, secondPart]) {
                this.clones.push(this.canvas.polygon(points.join(' '))
                    .attr('fill', this.editedShape.attr('fill'))
                    .attr('fill-opacity', '0.5')
                    .addClass('cvat_canvas_shape'));
            }

            for (const clone of this.clones) {
                clone.on('click', (): void => this.selectPolygon(clone));
                clone.on('mouseenter', (): void => {
                    clone.addClass('cvat_canvas_shape_splitting');
                }).on('mouseleave', (): void => {
                    clone.removeClass('cvat_canvas_shape_splitting');
                });
            }

            // We do not need these events any more
            this.canvas.off('mousedown.edit');
            this.canvas.off('mouseup.edit');
            this.canvas.off('mousemove.edit');

            (this.editLine as any).draw('stop');
            this.editLine.remove();
            this.editLine = null;

            return;
        }

        let points = null;
        const { offset } = this.geometry;
        if (this.editData.state.shapeType === 'polyline') {
            if (start !== this.editData.pointID) {
                linePoints.reverse();
            }
            points = oldPoints.slice(0, start)
                .concat(linePoints)
                .concat(oldPoints.slice(stop + 1));
        } else {
            points = oldPoints.concat(linePoints.slice(0, -1));
        }

        points = pointsToArray(points.join(' '))
            .map((coord: number): number => coord - offset);

        const { state } = this.editData;
        this.edit({
            enabled: false,
        });
        this.onEditDone(state, points);
    }

    private setupPoints(enabled: boolean): void {
        const self = this;
        const stopEdit = self.stopEdit.bind(self);

        if (enabled) {
            (this.editedShape as any).selectize(true, {
                deepSelect: true,
                pointSize: 2 * consts.BASE_POINT_SIZE / self.geometry.scale,
                rotationPoint: false,
                pointType(cx: number, cy: number): SVG.Circle {
                    const circle: SVG.Circle = this.nested
                        .circle(this.options.pointSize)
                        .stroke('black')
                        .fill(self.editedShape.attr('fill') || 'inherit')
                        .center(cx, cy)
                        .attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });

                    circle.node.addEventListener('mouseenter', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / self.geometry.scale,
                        });

                        circle.node.addEventListener('click', stopEdit);
                        circle.addClass('cvat_canvas_selected_point');
                    });

                    circle.node.addEventListener('mouseleave', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
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
        this.canvas.off('mouseup.edit');
        this.canvas.off('mousemove.edit');

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
            .select(`#cvat_canvas_shape_${this.editData.state.clientID}`)
            .first().clone();
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
        onEditDone: (state: any, points: number[]) => void,
        canvas: SVG.Container,
    ) {
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
}
