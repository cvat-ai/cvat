// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';

import { DrawData, Geometry } from './canvasModel';

export interface MasksDrawHandler {
    draw(drawData: DrawData, geometry: Geometry): void;
    transform(geometry: Geometry): void;
    cancel(): void;
}

export class MasksDrawHandlerImpl implements MasksDrawHandler {
    private onDrawDone: (
        data: object | null,
        duration?: number,
        continueDraw?: boolean,
        prevDrawData?: DrawData,
    ) => void;
    private onDrawAgain: (data: DrawData) => void;
    private isDrawing: boolean;
    private drawData: DrawData;
    private canvas: fabric.Canvas;
    private startTimestamp: number;
    private drawnPaths: fabric.Path[];

    private release(): void {
        this.canvas.getElement().parentElement.style.display = '';
        this.isDrawing = false;
        this.drawnPaths = [];
        this.onDrawDone(null);
    }

    public constructor(
        onDrawDone: (
            data: object | null,
            duration?: number,
            continueDraw?: boolean,
            prevDrawData?: DrawData,
        ) => void,
        onDrawAgain: (data: DrawData) => void,
        canvas: HTMLCanvasElement,
    ) {
        this.isDrawing = false;
        this.drawData = null;
        this.drawnPaths = [];
        this.onDrawDone = onDrawDone;
        this.onDrawAgain = onDrawAgain;
        this.canvas = new fabric.Canvas(canvas, { containerClass: 'cvat_masks_canvas_wrapper' });
        this.canvas.imageSmoothingEnabled = false;
        this.canvas.on('path:created', (opt) => {
            if (this.drawData.brushTool?.type === 'eraser') {
                (opt as any).path.globalCompositeOperation = 'destination-out';
            } else {
                (opt as any).path.globalCompositeOperation = 'xor';
            }
            if (this.drawData.brushTool.type === 'eraser') {
                const color = fabric.Color.fromHex('#ffffff');
                color.setAlpha(1);
                (opt as any).path.stroke = color.toRgba();
            }
            this.drawnPaths.push((opt as any).path);
        });
    }

    public transform(geometry: Geometry): void {
        const topCanvas = this.canvas.getElement().parentElement as HTMLDivElement;
        topCanvas.style.top = `${geometry.top}px`;
        topCanvas.style.left = `${geometry.left}px`;
        topCanvas.style.transform = `scale(${geometry.scale}) rotate(${geometry.angle}deg)`;
    }

    public draw(drawData: DrawData, geometry: Geometry): void {
        if (drawData.enabled && drawData.shapeType === 'mask') {
            if (!this.isDrawing) {
                this.canvas.setHeight(geometry.image.height);
                this.canvas.setWidth(geometry.image.width);
                this.canvas.isDrawingMode = true;
                this.canvas.getElement().parentElement.style.display = 'block';
                this.isDrawing = true;
                this.startTimestamp = Date.now();
            } else {
                this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
                this.canvas.freeDrawingBrush.width = drawData.brushTool.size;
                this.canvas.freeDrawingBrush.strokeLineCap = drawData.brushTool.form === 'circle' ? 'round' : 'square';
                this.canvas.freeDrawingBrush.strokeLineJoin = 'bevel';
                if (drawData.brushTool.type === 'eraser') {
                    const color = fabric.Color.fromHex('#ffffff');
                    color.setAlpha(0.5);
                    this.canvas.freeDrawingBrush.color = color.toRgba();
                } else {
                    const color = fabric.Color.fromHex(drawData.brushTool.color);
                    color.setAlpha(0.5);
                    this.canvas.freeDrawingBrush.color = color.toRgba();
                }
            }
            this.drawData = drawData;
        } else if (this.isDrawing) {
            // todo: make a smarter validation
            if (this.drawnPaths.length) {
                const imageData = this.canvas.getContext().getImageData(0, 0, 1920, 1080).data;
                const alpha = [];
                for (let i = 3; i < imageData.length; i += 4) {
                    alpha.push(imageData[i] > 0 ? 128 : 0);
                }

                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
                    points: alpha,
                }, Date.now() - this.startTimestamp, drawData.continue, this.drawData);
            }

            this.release();
            if (drawData.continue) {
                this.onDrawAgain(this.drawData);
            } else {
                this.drawData = drawData;
            }
        }
    }

    public cancel(): void {
        this.release();
    }
}
