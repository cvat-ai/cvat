// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';

import { Configuration, DrawData, Geometry } from './canvasModel';
import consts from './consts';

export interface MasksDrawHandler {
    configurate(configuration: Configuration): void;
    draw(drawData: DrawData): void;
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
    private isPolygonDrawing: boolean;
    private drawablePolygon: null | fabric.Polyline;
    private drawData: DrawData;
    private canvas: fabric.Canvas;
    private startTimestamp: number;
    private geometry: Geometry;
    private drawnObjects: (fabric.Path | fabric.Polygon)[];
    private drawingOpacity: number;

    private keepDrawnPolygon(): void {
        // TODO: check if polygon has at least three different points
        this.drawablePolygon.stroke = undefined;
        if (this.drawData.brushTool?.type === 'polygon-minus') {
            this.drawablePolygon.globalCompositeOperation = 'destination-out';
            this.drawablePolygon.opacity = 1;
        } else {
            this.drawablePolygon.globalCompositeOperation = 'xor';
            this.drawablePolygon.opacity = 0.5;
            this.drawnObjects.push(this.drawablePolygon);
        }

        this.drawablePolygon = null;
        this.canvas.renderAll();
    }

    private release(): void {
        this.canvas.clear();
        this.canvas.renderAll();
        this.canvas.getElement().parentElement.style.display = '';
        this.isDrawing = false;
        this.isPolygonDrawing = false;
        this.drawnObjects = [];
        this.onDrawDone(null);
        if (this.drawablePolygon) {
            this.drawablePolygon = null;
        }
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
        this.drawnObjects = [];
        this.drawingOpacity = 0.5;
        this.onDrawDone = onDrawDone;
        this.onDrawAgain = onDrawAgain;
        this.canvas = new fabric.Canvas(canvas, { containerClass: 'cvat_masks_canvas_wrapper', fireRightClick: true, selection: false });
        this.canvas.imageSmoothingEnabled = false;
        this.canvas.on('path:created', (opt) => {
            if (this.drawData.brushTool?.type === 'eraser') {
                (opt as any).path.globalCompositeOperation = 'destination-out';
            } else {
                (opt as any).path.globalCompositeOperation = 'xor';
            }

            let color = new fabric.Color(this.drawData.brushTool?.color || 'white');
            color.setAlpha(0.5);
            if (this.drawData.brushTool.type === 'eraser') {
                color = fabric.Color.fromHex('#ffffff');
                color.setAlpha(1);
            }
            (opt as any).path.stroke = color.toRgba();
            this.drawnObjects.push((opt as any).path);
        });

        this.canvas.getElement().parentElement.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());

        this.canvas.on('mouse:dblclick', (options: fabric.IEvent<MouseEvent>) => {
            if (!this.drawablePolygon) return;
            const points = this.drawablePolygon.get('points').slice(0, -2); // removed the latest two points just added
            this.drawablePolygon.set('points', points);
            this.keepDrawnPolygon();
            options.e.stopPropagation();
        });

        this.canvas.on('mouse:down', (options: fabric.IEvent<MouseEvent>) => {
            if (this.isPolygonDrawing) {
                const point = new fabric.Point(options.e.offsetX, options.e.offsetY);
                if (!this.drawablePolygon) {
                    // polygon not created yet, first click
                    this.drawablePolygon = new fabric.Polygon([point, fabric.util.object.clone(point)], {
                        opacity: this.drawingOpacity,
                        strokeWidth: consts.BASE_STROKE_WIDTH / this.geometry.scale,
                        stroke: 'black',
                        fill: this.drawData.brushTool.type === 'polygon-minus' ? 'white' : (this.drawData.brushTool?.color || 'white'),
                        selectable: false,
                        objectCaching: false,
                        absolutePositioned: true,
                    });
                    this.canvas.add(this.drawablePolygon);
                } if (options.e.button === 2) {
                    // remove the latest button
                    const points = this.drawablePolygon.get('points');
                    if (points.length > 2) { // at least three points including sliding point
                        points.splice(points.length - 2, 1);
                        this.drawablePolygon.set('points', [...points]);
                    } else {
                        this.canvas.remove(this.drawablePolygon);
                        this.drawablePolygon = null;
                    }
                } else {
                    // remove sliding point, add one point, add new sliding point
                    this.drawablePolygon.set('points', [
                        ...this.drawablePolygon.get('points').slice(0, -1),
                        point,
                        fabric.util.object.clone(point),
                    ]);
                }
                this.canvas.renderAll();
            }
        });

        this.canvas.on('mouse:move', (e: fabric.IEvent<MouseEvent>) => {
            if (!this.drawablePolygon) return;
            const points = this.drawablePolygon.get('points');
            if (points.length) {
                points[points.length - 1].setX(e.e.offsetX);
                points[points.length - 1].setY(e.e.offsetY);
                this.canvas.renderAll();
            }
        });
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        this.canvas.setHeight(this.geometry.image.height);
        this.canvas.setWidth(this.geometry.image.width);
        this.canvas.setDimensions({ width: this.geometry.image.width, height: this.geometry.image.height });

        const topCanvas = this.canvas.getElement().parentElement as HTMLDivElement;
        topCanvas.style.top = `${geometry.top}px`;
        topCanvas.style.left = `${geometry.left}px`;
        topCanvas.style.transform = `scale(${geometry.scale}) rotate(${geometry.angle}deg)`;

        if (this.drawablePolygon) {
            this.drawablePolygon.set('strokeWidth', consts.BASE_STROKE_WIDTH / this.geometry.scale);
            this.canvas.renderAll();
        }
    }

    public configurate(configuration: Configuration): void {
        if (typeof configuration.creationOpacity === 'number') {
            this.drawingOpacity = Math.max(0, Math.min(1, configuration.creationOpacity));

            if (this.drawablePolygon) {
                this.drawablePolygon.set('opacity', this.drawingOpacity);
                this.canvas.renderAll();
            }

            if (this.canvas.freeDrawingBrush?.color) {
                const color = fabric.Color.fromRgba(this.canvas.freeDrawingBrush.color);
                color.setAlpha(this.drawingOpacity);
                this.canvas.freeDrawingBrush.color = color.toRgba();
            }
        }
    }

    public draw(drawData: DrawData): void {
        if (drawData.enabled && drawData.shapeType === 'mask') {
            if (!this.isDrawing) {
                // initialize new drawing process
                this.canvas.getElement().parentElement.style.display = 'block';
                this.isDrawing = true;
                this.startTimestamp = Date.now();
            } else if (['polygon-plus', 'polygon-minus'].includes(drawData.brushTool?.type)) {
                if (!this.isPolygonDrawing) {
                    this.isPolygonDrawing = true;
                    this.canvas.isDrawingMode = false;
                }
            } else {
                this.canvas.isDrawingMode = true;
                this.canvas.isDrawingMode = true;
                this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
                this.canvas.freeDrawingBrush.width = drawData.brushTool.size;
                this.canvas.freeDrawingBrush.strokeLineCap = drawData.brushTool.form === 'circle' ? 'round' : 'square';
                this.canvas.freeDrawingBrush.strokeLineJoin = 'bevel';
                let color = fabric.Color.fromHex(drawData.brushTool.color);
                if (drawData.brushTool.type === 'eraser') {
                    color = fabric.Color.fromHex('#ffffff');
                }
                color.setAlpha(this.drawingOpacity);
                this.canvas.freeDrawingBrush.color = color.toRgba();
                if (this.isPolygonDrawing && this.drawablePolygon) {
                    this.keepDrawnPolygon();
                    this.isPolygonDrawing = false;
                }
            }
            this.drawData = drawData;
        } else if (this.isDrawing) {
            // todo: make a smarter validation
            if (this.drawnObjects.length) {
                const { width, height } = this.geometry.image;
                const imageData = this.canvas.getContext().getImageData(0, 0, width, height).data;
                let alpha = [];
                for (let i = 3; i < imageData.length; i += 4) {
                    alpha.push(imageData[i] > 0 ? 128 : 0);
                }

                alpha = alpha.reduce<number[]>((acc, val, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] === val) {
                        acc[acc.length - 2] += 1;
                    } else {
                        acc.push(1, val);
                    }
                    return acc;
                }, []);

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
