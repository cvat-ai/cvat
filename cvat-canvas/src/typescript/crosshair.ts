// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';

export default class Crosshair {
    private x: SVG.Line | null;
    private y: SVG.Line | null;
    private canvas: SVG.Container | null;

    public constructor() {
        this.x = null;
        this.y = null;
        this.canvas = null;
    }

    public show(canvas: SVG.Container, x: number, y: number, scale: number): void {
        if (this.canvas && this.canvas !== canvas) {
            if (this.x) this.x.remove();
            if (this.y) this.y.remove();
            this.x = null;
            this.y = null;
        }

        this.canvas = canvas;
        this.x = this.canvas
            .line(0, y, this.canvas.node.clientWidth, y)
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * scale),
            })
            .addClass('cvat_canvas_crosshair');

        this.y = this.canvas
            .line(x, 0, x, this.canvas.node.clientHeight)
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * scale),
            })
            .addClass('cvat_canvas_crosshair');
    }

    public hide(): void {
        if (this.x) {
            this.x.remove();
            this.x = null;
        }

        if (this.y) {
            this.y.remove();
            this.y = null;
        }

        this.canvas = null;
    }

    public move(x: number, y: number): void {
        if (this.x) {
            this.x.attr({ y1: y, y2: y });
        }

        if (this.y) {
            this.y.attr({ x1: x, x2: x });
        }
    }

    public scale(scale: number): void {
        if (this.x) {
            this.x.attr('stroke-width', consts.BASE_STROKE_WIDTH / (2 * scale));
        }

        if (this.y) {
            this.y.attr('stroke-width', consts.BASE_STROKE_WIDTH / (2 * scale));
        }
    }
}
