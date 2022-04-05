// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';

import {
    Configuration, DrawData, MasksEditData, Geometry,
} from './canvasModel';
import consts from './consts';
import { PropType } from './shared';

export interface MasksHandler {
    configurate(configuration: Configuration): void;
    draw(drawData: DrawData): void;
    edit(state: MasksEditData): void;
    transform(geometry: Geometry): void;
    setupStates(objectStates: any[]): void;
    cancel(): void;
    enabled: boolean;
}

export class MasksHandlerImpl implements MasksHandler {
    private onDrawDone: (
        data: object | null,
        duration?: number,
        continueDraw?: boolean,
        prevDrawData?: DrawData,
    ) => void;
    private onContinueDraw: (data: DrawData) => void;
    private onEditStart: (state: any) => void;
    private onEditDone: (state: any, points: number[]) => void;
    private dispatchEvent: (event: Event) => void;

    private isDrawing: boolean;
    private isEditing: boolean;
    private isPolygonDrawing: boolean;
    private drawablePolygon: null | fabric.Polyline;
    private drawData: DrawData | null;
    private editData: MasksEditData | null;
    private canvas: fabric.Canvas;
    private objectStates: any[];
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

    private releaseDraw(): void {
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

    private releaseEdit(): void {
        this.canvas.clear();
        this.canvas.renderAll();
        this.canvas.getElement().parentElement.style.display = '';
        this.isEditing = false;
        this.drawnObjects = [];
        this.onEditDone(null, null);
    }

    public constructor(
        onDrawDone: (
            data: object | null,
            duration?: number,
            continueDraw?: boolean,
            prevDrawData?: DrawData,
        ) => void,
        onContinueDraw: (data: DrawData) => void,
        dispatchEvent: (event: Event) => void,
        onEditStart: (state: any) => void,
        onEditDone: (state: any, points: number[]) => void,
        canvas: HTMLCanvasElement,
    ) {
        this.isDrawing = false;
        this.isEditing = false;
        this.drawData = null;
        this.editData = null;
        this.drawnObjects = [];
        this.objectStates = [];
        this.drawingOpacity = 0.5;
        this.onDrawDone = onDrawDone;
        this.onContinueDraw = onContinueDraw;
        this.onEditDone = onEditDone;
        this.onEditStart = onEditStart;
        this.dispatchEvent = dispatchEvent;
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
        const {
            image: { width, height }, scale, angle, top, left,
        } = geometry;

        const topCanvas = this.canvas.getElement().parentElement as HTMLDivElement;
        this.canvas.setHeight(height);
        this.canvas.setWidth(width);
        this.canvas.setDimensions({ width, height });
        topCanvas.style.top = `${top}px`;
        topCanvas.style.left = `${left}px`;
        topCanvas.style.transform = `scale(${scale}) rotate(${angle}deg)`;

        if (this.drawablePolygon) {
            this.drawablePolygon.set('strokeWidth', consts.BASE_STROKE_WIDTH / scale);
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
                type BoundingRect = ReturnType<PropType<fabric.Polygon, 'getBoundingRect'>>;
                type TwoCornerBox = Pick<BoundingRect, 'top' | 'left'> & { right: number; bottom: number };
                const { width, height } = this.geometry.image;
                const wrappingBbox = this.drawnObjects
                    .map((element: fabric.Path | fabric.Polygon) => element.getBoundingRect())
                    .reduce((acc: TwoCornerBox, rect: BoundingRect) => {
                        acc.top = Math.floor(Math.max(0, Math.min(rect.top, acc.top)));
                        acc.left = Math.floor(Math.max(0, Math.min(rect.left, acc.left)));
                        acc.bottom = Math.floor(Math.min(height - 1, Math.max(rect.top + rect.height, acc.bottom)));
                        acc.right = Math.floor(Math.min(width - 1, Math.max(rect.left + rect.width, acc.right)));
                        return acc;
                    }, {
                        left: Number.MAX_SAFE_INTEGER,
                        top: Number.MAX_SAFE_INTEGER,
                        right: Number.MIN_SAFE_INTEGER,
                        bottom: Number.MIN_SAFE_INTEGER,
                    });

                const imageData = this.canvas.toCanvasElement()
                    .getContext('2d').getImageData(
                        wrappingBbox.left, wrappingBbox.top,
                        wrappingBbox.right - wrappingBbox.left, wrappingBbox.bottom - wrappingBbox.top,
                    ).data;

                let alpha = [];
                for (let i = 3; i < imageData.length; i += 4) {
                    alpha.push(imageData[i] > 0 ? 1 : 0);
                }

                if (this.drawData.brushTool?.removeUnderlyingPixels) {
                    for (const state of this.objectStates) {
                        const [left, top, right, bottom] = state.points.slice(-4);
                        const [stateWidth, stateHeight] = [Math.floor(right - left), Math.floor(bottom - top)];
                        // todo: check box intersection to optimize
                        const points = state.points.slice(0, -4);
                        for (let i = 0; i < alpha.length - 4; i++) {
                            if (!alpha[i]) continue;
                            const x = (i % (wrappingBbox.right - wrappingBbox.left)) + wrappingBbox.left;
                            const y = Math.trunc(i / (wrappingBbox.right - wrappingBbox.left)) + wrappingBbox.top;
                            const translatedX = x - left;
                            const translatedY = y - top;
                            if (translatedX >= 0 && translatedX < stateWidth &&
                                translatedY >= 0 && translatedY < stateHeight) {
                                const j = translatedY * stateWidth + translatedX;
                                points[j] = 0;
                            }
                        }

                        points.push(left, top, right, bottom);

                        // todo: do not edit shapes here because it creates more history actions
                        const event: CustomEvent = new CustomEvent('canvas.edited', {
                            bubbles: false,
                            cancelable: true,
                            detail: {
                                state,
                                points,
                                rotation: 0,
                            },
                        });

                        this.dispatchEvent(event);
                    }
                }

                alpha = alpha.reduce<number[]>((acc, val, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] === val) {
                        acc[acc.length - 2] += 1;
                    } else {
                        acc.push(1, val);
                    }
                    return acc;
                }, []);

                alpha.push(wrappingBbox.left, wrappingBbox.top, wrappingBbox.right, wrappingBbox.bottom);

                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
                    points: alpha,
                }, Date.now() - this.startTimestamp, drawData.continue, this.drawData);
            }

            this.releaseDraw();
            if (drawData.continue) {
                this.onContinueDraw(this.drawData);
            } else {
                this.drawData = drawData;
            }
        }
    }

    public edit(editData: MasksEditData): void {
        // todo: disable some controls from brush toolbar
        // todo: during drawing add other parts using xor global operator

        if (editData.enabled && editData.state.shapeType === 'mask') {
            if (!this.isEditing) {
                this.isEditing = true;
                // add existing mask to canvas
                this.onEditStart(editData.state);
            }
        } else if (!editData.enabled) {
            // todo: compute new shape
            const points = [];
            this.onEditDone(this.editData.state, points);
            this.releaseDraw();
        }
        this.editData = editData;
    }

    public setupStates(objectStates: any[]): void {
        this.objectStates = objectStates;
    }

    get enabled(): boolean {
        return this.isDrawing || this.isEditing;
    }

    public cancel(): void {
        if (this.isDrawing) {
            this.releaseDraw();
        }

        if (this.isEditing) {
            this.releaseEdit();
        }
    }
}
