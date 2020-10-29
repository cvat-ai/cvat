// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';

import consts from './consts';
import { translateToSVG } from './shared';
import { Geometry } from './canvasModel';

export interface ROISelector {
    select(enabled: boolean): void;
    selectObject(state: any): void;
    resetSelectedObjects(): void;
    cancel(): void;
    transform(geometry: Geometry): void;
}

export class ROISelectorImpl implements ROISelector {
    private onROISelected: (points?: number[]) => void;
    private onFindObject: (event: MouseEvent) => void;
    private geometry: Geometry;
    private canvas: SVG.Container;
    private selectionRect: SVG.Rect | null;
    private highlightedShape: SVG.Shape | null;
    private highlightedState: any | null;
    private startSelectionPoint: {
        x: number;
        y: number;
    };

    private getSelectionBox(event: MouseEvent): { xtl: number; ytl: number; xbr: number; ybr: number } {
        const point = translateToSVG((this.canvas.node as any) as SVGSVGElement, [event.clientX, event.clientY]);
        const stopSelectionPoint = {
            x: point[0],
            y: point[1],
        };

        return {
            xtl: Math.min(this.startSelectionPoint.x, stopSelectionPoint.x),
            ytl: Math.min(this.startSelectionPoint.y, stopSelectionPoint.y),
            xbr: Math.max(this.startSelectionPoint.x, stopSelectionPoint.x),
            ybr: Math.max(this.startSelectionPoint.y, stopSelectionPoint.y),
        };
    }

    private onMouseMove = (event: MouseEvent): void => {
        if (this.selectionRect) {
            const box = this.getSelectionBox(event);

            this.selectionRect.attr({
                x: box.xtl,
                y: box.ytl,
                width: box.xbr - box.xtl,
                height: box.ybr - box.ytl,
            });
        } else {
            this.blurObject();
            this.onFindObject(event);
        }
    };

    private onMouseDown = (event: MouseEvent): void => {
        if (this.highlightedState) {
            this.onROISelected([...this.highlightedState.points]);
            return;
        }

        if (!this.selectionRect && !event.altKey) {
            this.blurObject();
            const point = translateToSVG((this.canvas.node as any) as SVGSVGElement, [event.clientX, event.clientY]);
            this.startSelectionPoint = {
                x: point[0],
                y: point[1],
            };

            this.selectionRect = this.canvas
                .rect()
                .attr({
                    'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                })
                .addClass('cvat_canvas_shape_roi_selection');
            this.selectionRect.attr({ ...this.startSelectionPoint });
        }
    };

    private onMouseUp = (): void => {
        const { offset } = this.geometry;
        if (this.selectionRect) {
            const {
                w, h, x, y, x2, y2,
            } = this.selectionRect.bbox();
            this.selectionRect.remove();
            this.selectionRect = null;
            if (w === 0 && h === 0) {
                this.onROISelected([x - offset, y - offset]);
            } else {
                this.onROISelected([x - offset, y - offset, x2 - offset, y2 - offset]);
            }
        }
    };

    private startSelection(): void {
        this.canvas.node.addEventListener('mousemove', this.onMouseMove);
        this.canvas.node.addEventListener('mousedown', this.onMouseDown);
        this.canvas.node.addEventListener('mouseup', this.onMouseUp);
    }

    private stopSelection(): void {
        this.canvas.node.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.node.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.node.removeEventListener('mouseup', this.onMouseUp);
    }

    private release(): void {
        this.stopSelection();
        this.blurObject();
    }

    private highlightObject(): void {
        const shape = this.canvas.select(`#cvat_canvas_shape_${this.highlightedState.clientID}`).first();
        if (shape) {
            this.highlightedShape = shape;
            this.highlightedShape.addClass('cvat_canvas_shape_roi_selection');
        }
    }

    private blurObject(): void {
        if (this.highlightedState && this.highlightedShape !== null) {
            this.highlightedShape.removeClass('cvat_canvas_shape_roi_selection');
        }

        this.highlightedState = null;
        this.highlightedShape = null;
    }

    public constructor(
        onROISelected: (points?: number[]) => void,
        onFindObject: (event: MouseEvent) => void,
        canvas: SVG.Container,
        geometry: Geometry,
    ) {
        this.onROISelected = onROISelected;
        this.onFindObject = onFindObject;
        this.geometry = geometry;
        this.canvas = canvas;
        this.selectionRect = null;
        this.highlightedShape = null;
        this.highlightedState = null;
    }

    public select(enabled: boolean): void {
        if (enabled) {
            this.startSelection();
        } else {
            this.release();
        }
    }

    public selectObject(state: any): void {
        const { clientID } = state;
        if (!this.highlightedState || clientID !== this.highlightedState.clientID) {
            this.blurObject();
            this.highlightedState = state;
            this.highlightObject();
        }
    }

    public cancel(): void {
        this.release();
        this.onROISelected();
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        if (this.selectionRect) {
            this.selectionRect.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
            });
        }
    }

    public resetSelectedObjects(): void {
        this.blurObject();
    }
}
