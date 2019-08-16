/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import * as SVG from 'svg.js';
import consts from './consts';
import { DrawData, Geometry } from './canvasModel';


export interface DrawHandler {
    draw(drawData: DrawData, geometry: Geometry): void;
}

export class DrawHandlerImpl implements DrawHandler {
    private onNewShape: any; // callback is used to notify about creating new shape
    private canvas: SVG.Container;
    private aim: {
        x: SVG.Line;
        y: SVG.Line;
    };
    private drawData: DrawData;

    private addAim(geometry: Geometry): void {
        this.aim = {
            x: this.canvas.line(0, 0, this.canvas.node.clientWidth, 0).attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * geometry.scale),
                zOrder: Number.MAX_SAFE_INTEGER,
            }).addClass('cvat_canvas_aim'),
            y: this.canvas.line(0, 0, 0, this.canvas.node.clientHeight).attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * geometry.scale),
                zOrder: Number.MAX_SAFE_INTEGER,
            }).addClass('cvat_canvas_aim'),
        };
    }

    private removeAim(): void {
        this.aim.x.remove();
        this.aim.y.remove();
        this.aim = null;
    }

    private initDrawing(geometry: Geometry): void {
        if (this.drawData.aim) {
            this.addAim(geometry);
        }
    }

    private closeDrawing(): void {
        if (this.aim) {
            this.removeAim();
        }
    }

    public constructor(onNewShape: any, canvas: SVG.Container) {
        this.onNewShape = onNewShape;
        this.canvas = canvas;
        this.drawData = null;
        this.aim = null;

        this.canvas.node.addEventListener('mousemove', (e): void => {
            if (this.aim) {
                this.aim.x.attr({
                    y1: e.offsetY,
                    y2: e.offsetY,
                });

                this.aim.y.attr({
                    x1: e.offsetX,
                    x2: e.offsetX,
                });
            }
        });
    }

    public transform(geometry: Geometry): void {
        if (this.aim) {
            this.aim.x.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * geometry.scale),
            });
            this.aim.y.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * geometry.scale),
            });
        }
    }

    public draw(drawData: DrawData, geometry: Geometry): void {
        this.drawData = drawData;

        if (this.drawData.enabled) {
            this.initDrawing(geometry);
        } else {
            this.closeDrawing();
        }
    }
}
