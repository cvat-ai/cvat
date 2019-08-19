/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import * as SVG from 'svg.js';
import consts from './consts';
import 'svg.resize.js';

import {
    DrawData,
    Geometry,
} from './canvasModel';

import {
    translateToSVG,
    translateFromSVG,
} from './shared';

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
    private geometry: Geometry;
    private drawInstance: any;


    private addAim(): void {
        this.aim = {
            x: this.canvas.line(0, 0, this.canvas.node.clientWidth, 0).attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * this.geometry.scale),
                zOrder: Number.MAX_SAFE_INTEGER,
            }).addClass('cvat_canvas_aim'),
            y: this.canvas.line(0, 0, 0, this.canvas.node.clientHeight).attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / (2 * this.geometry.scale),
                zOrder: Number.MAX_SAFE_INTEGER,
            }).addClass('cvat_canvas_aim'),
        };
    }

    private removeAim(): void {
        this.aim.x.remove();
        this.aim.y.remove();
        this.aim = null;
    }

    private initDrawing(): void {
        if (this.drawData.aim) {
            this.addAim();
        }
    }

    private closeDrawing(): void {
        if (this.aim) {
            this.removeAim();
        }

        this.drawData = {
            enabled: false,
        };
    }

    private drawBox(): void {
        this.drawInstance = this.canvas.rect();
        this.drawInstance.draw({
            snapToGrid: 0.1,
        }).addClass('cvat_canvas_shape_drawing').attr({
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
        }).on('drawstop', (e: Event): void => {
            const frameWidth = this.geometry.image.width;
            const frameHeight = this.geometry.image.height;
            const bbox = (e.target as SVGRectElement).getBBox();

            let [xtl, ytl, xbr, ybr] = translateFromSVG(
                this.canvas.node as any as SVGSVGElement,
                [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height],
            );

            xtl = Math.min(Math.max(xtl, 0), frameWidth);
            xbr = Math.min(Math.max(xbr, 0), frameWidth);
            ytl = Math.min(Math.max(ytl, 0), frameHeight);
            ybr = Math.min(Math.max(ybr, 0), frameHeight);

            this.onNewShape([xtl, ytl, xbr, ybr]);
            this.closeDrawing();
        });
    }

    private drawPolygon(): void {

    }

    private drawPolyline(): void {

    }

    private drawPoints(): void {

    }

    private startDraw(): void {
        // TODO: Use enums after typification cvat-core
        switch (this.drawData.shapeType) {
            case 'rectangle': {
                this.drawBox();
                break;
            }
            case 'polygon': {
                this.drawPolygon();
                break;
            }
            case 'polyline': {
                this.drawPolyline();
                break;
            }
            case 'points': {
                this.drawPoints();
                break;
            }
            default:
        }
    }

    public constructor(onNewShape: any, canvas: SVG.Container) {
        this.onNewShape = onNewShape;
        this.canvas = canvas;
        this.drawData = null;
        this.geometry = null;
        this.aim = null;
        this.drawInstance = null;

        this.canvas.node.addEventListener('mousemove', (e): void => {
            if (this.aim) {
                const [x, y] = translateToSVG(
                    this.canvas.node as any as SVGSVGElement,
                    [e.clientX, e.clientY],
                );

                this.aim.x.attr({
                    y1: y,
                    y2: y,
                });

                this.aim.y.attr({
                    x1: x,
                    x2: x,
                });
            }
        });
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;

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
        this.geometry = geometry;

        if (this.drawData.enabled) {
            this.initDrawing();
            this.startDraw();
        } else {
            this.closeDrawing();
        }
    }
}
