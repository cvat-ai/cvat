// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';

import consts from './consts';
import { translateToSVG } from './shared';
import { Geometry } from './canvasModel';

export interface RegionSelector {
    select(enabled: boolean): void;
    cancel(): void;
    transform(geometry: Geometry): void;
}

export class RegionSelectorImpl implements RegionSelector {
    private onRegionSelected: (points?: number[]) => void;
    private geometry: Geometry;
    private canvas: SVG.Container;
    private selectionRect: SVG.Rect | null;
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
        }
    };

    private onMouseDown = (event: MouseEvent): void => {
        if (!this.selectionRect && !event.altKey) {
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
                .addClass('cvat_canvas_shape_region_selection');
            this.selectionRect.attr({ ...this.startSelectionPoint, width: 1, height: 1 });
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
            if (w <= 1 && h <= 1) {
                this.onRegionSelected([x - offset, y - offset]);
            } else {
                this.onRegionSelected([x - offset, y - offset, x2 - offset, y2 - offset]);
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
    }

    public constructor(onRegionSelected: RegionSelectorImpl['onRegionSelected'], canvas: SVG.Container, geometry: Geometry) {
        this.onRegionSelected = onRegionSelected;
        this.geometry = geometry;
        this.canvas = canvas;
        this.selectionRect = null;
    }

    public select(enabled: boolean): void {
        if (enabled) {
            this.startSelection();
        } else {
            this.release();
        }
    }

    public cancel(): void {
        this.release();
        this.onRegionSelected();
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        if (this.selectionRect) {
            this.selectionRect.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
            });
        }
    }
}
