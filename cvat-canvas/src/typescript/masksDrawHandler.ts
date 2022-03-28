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
    private onDrawDone: (data: object | null, duration?: number, continueDraw?: boolean) => void;
    private isDrawing: boolean;
    private drawData: DrawData;
    private canvas: fabric.Canvas;
    private drawnPaths: fabric.Path[];

    private release(): void {
        this.isDrawing = false;
    }

    public constructor(
        onDrawDone: (data: object | null, duration?: number, continueDraw?: boolean) => void,
        canvas: HTMLCanvasElement,
    ) {
        this.isDrawing = false;
        this.drawData = null;
        this.drawnPaths = [];
        this.onDrawDone = onDrawDone;
        this.canvas = new fabric.Canvas(canvas);
        this.canvas.getElement().parentElement.classList.add('cvat_masks_canvas_wrapper');
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

            let imageData = this.canvas.getContext('2d').getImageData(0, 0, 1920, 1080).data;
            let alpha = [];
            for (let i = 3; i < 8294400; i += 4) {
                alpha.push(imageData[i]);
            }

            // todo: finish and save alpha channel to rle string, draw it back on canvas
            console.log(alpha)
        });

        this.canvas.on('mouse:up:before', (e) => {
            console.log(e);
        })
    }

    public transform(geometry: Geometry): void {
        const topCanvas = this.canvas.getElement().parentElement as HTMLDivElement;
        topCanvas.style.top = `${geometry.top}px`;
        topCanvas.style.left = `${geometry.left}px`;
        topCanvas.style.transform = `scale(${geometry.scale}) rotate(${geometry.angle}deg)`;
    }

    public draw(drawData: DrawData, geometry: Geometry): void {
        this.drawData = drawData;
        if (drawData.enabled) {
            if (!this.isDrawing) {
                this.canvas.setHeight(geometry.image.height);
                this.canvas.setWidth(geometry.image.width);
                this.canvas.isDrawingMode = true;
                this.isDrawing = true;
            } else {
                this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
                this.canvas.freeDrawingBrush.strokeLineCap = drawData.brushTool.form;
                this.canvas.freeDrawingBrush.width = drawData.brushTool.size;
                this.canvas.freeDrawingBrush.strokeLineCap = drawData.brushTool.form === 'circle' ? 'round' : 'square';
                this.canvas.freeDrawingBrush.strokeLineJoin = 'round';
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
        } else {
            this.release();
        }
    }

    public cancel(): void {
        this.release();
    }
}
