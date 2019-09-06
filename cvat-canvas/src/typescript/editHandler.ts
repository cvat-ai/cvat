/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import * as SVG from 'svg.js';
import 'svg.select.js';

import consts from './consts';
import {
    translateFromSVG,
    translateBetweenSVG,
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
    private background: SVGSVGElement;
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

        const handleSlide = function handleSlide(e: MouseEvent): void {
            if (e.shiftKey) {
                if (lastDrawnPoint.x === null || lastDrawnPoint.y === null) {
                    this.editLine.draw('point', e);
                } else {
                    const deltaTreshold = 15;
                    const delta = Math.sqrt(
                        ((e.clientX - lastDrawnPoint.x) ** 2)
                        + ((e.clientY - lastDrawnPoint.y) ** 2),
                    );
                    if (delta > deltaTreshold) {
                        this.editLine.draw('point', e);
                    }
                }
            }
        }.bind(this);
        this.canvas.on('mousemove.draw', handleSlide);

        this.editLine = (this.canvas as any).polyline().draw({
            snapToGrid: 0.1,
        }).addClass('cvat_canvas_shape_drawing').style({
            'pointer-events': 'none',
            'fill-opacity': 0,
        }).on('drawstart drawpoint', (e: CustomEvent): void => {
            this.transform(this.geometry);
            lastDrawnPoint.x = e.detail.event.clientX;
            lastDrawnPoint.y = e.detail.event.clientY;
        });

        if (this.editData.state.shapeType === 'points') {
            this.editLine.style('stroke-width', 0);
        } else {
            // generate mouse event
            const dummyEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                clientX,
                clientY,
            });
            (this.editLine as any).draw('point', dummyEvent);
        }
    }

    private stopEdit(e: MouseEvent): void {
        function selectPolygon(shape: SVG.Polygon): void {
            const points = translateBetweenSVG(
                this.canvas.node as any as SVGSVGElement,
                this.background,
                pointsToArray(shape.attr('points')),
            );

            const { state } = this.editData;
            this.edit({
                enabled: false,
            });
            this.onEditDone(state, points);
        }

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
                    .style('fill-opacity', '0.5')
                    .addClass('cvat_canvas_shape'));
            }

            for (const clone of this.clones) {
                clone.on('click', selectPolygon.bind(this, clone));
                clone.on('mouseenter', (): void => {
                    clone.addClass('cvat_canvas_shape_splitting');
                }).on('mouseleave', (): void => {
                    clone.removeClass('cvat_canvas_shape_splitting');
                });
            }

            (this.editLine as any).draw('stop');
            this.editLine.remove();
            this.editLine = null;

            return;
        }

        let points = null;
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

        points = translateBetweenSVG(
            this.canvas.node as any as SVGSVGElement,
            this.background,
            pointsToArray(points.join(' ')),
        );

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
        this.canvas.off('mousemove.draw');

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
        background: SVGSVGElement,
    ) {
        this.onEditDone = onEditDone;
        this.canvas = canvas;
        this.background = background;
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

        if (this.editLine) {
            (this.editLine as any).draw('transform');
            if (this.editData.state.shapeType !== 'points') {
                this.editLine.style({
                    'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
                });
            }

            const paintHandler = this.editLine.remember('_paintHandler');

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
}
