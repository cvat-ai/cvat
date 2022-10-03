// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';

import {
    DrawData, MasksEditData, Geometry, Configuration, BrushTool,
} from './canvasModel';
import consts from './consts';
import {
    PropType, computeWrappingBox, alphaChannelOnly, expandChannels, imageDataToDataURL, rotate2DPoints,
} from './shared';

interface WrappingBBox {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface MasksHandler {
    draw(drawData: DrawData): void;
    edit(state: MasksEditData): void;
    configurate(configuration: Configuration): void;
    transform(geometry: Geometry): void;
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
    private onDrawRepeat: (data: DrawData) => void;
    private onEditStart: (state: any) => void;
    private onEditDone: (state: any, points: number[]) => void;

    private redraw: number | null;
    private isDrawing: boolean;
    private isEditing: boolean;
    private isInsertion: boolean;
    private isMouseDown: boolean;
    private isBrushSizeChanging: boolean;
    private resizeBrushToolLatestX: number;
    private brushMarker: fabric.Rect | fabric.Circle | null;
    private drawablePolygon: null | fabric.Polygon;
    private drawnObjects: (fabric.Polygon | fabric.Circle | fabric.Rect | fabric.Line | fabric.Image)[];

    private tool: DrawData['brushTool'] | null;
    private drawData: DrawData | null;
    private canvas: fabric.Canvas;

    private editData: MasksEditData | null;

    private colorBy: 'Instance' | 'Group' | 'Label';
    private latestMousePos: { x: number; y: number; };
    private startTimestamp: number;
    private geometry: Geometry;
    private drawingOpacity: number;

    private keepDrawnPolygon(): void {
        try {
            const points = this.drawablePolygon.get('points');
            if (points.length > 3) { // at least three points necessary including sliding point
                points.splice(points.length - 1, 1);
                this.drawablePolygon.set('points', [...points]);
            } else {
                this.canvas.remove(this.drawablePolygon);
                return;
            }

            if (this.tool.type === 'polygon-minus') {
                this.drawablePolygon.globalCompositeOperation = 'destination-out';
                this.drawablePolygon.opacity = 1;
            } else {
                this.drawablePolygon.globalCompositeOperation = 'xor';
                this.drawablePolygon.opacity = 0.5;
                this.drawnObjects.push(this.drawablePolygon);
            }

            this.drawablePolygon.stroke = undefined;
            this.canvas.renderAll();
        } finally {
            this.drawablePolygon = null;
        }
    }

    private removeBrushMarker(): void {
        if (this.brushMarker) {
            this.canvas.remove(this.brushMarker);
            this.brushMarker = null;
            this.canvas.renderAll();
        }
    }

    private setupBrushMarker(): void {
        if (['brush', 'eraser'].includes(this.tool.type)) {
            const common = {
                evented: false,
                selectable: false,
                opacity: 0.75,
                left: this.latestMousePos.x - this.tool.size / 2,
                top: this.latestMousePos.y - this.tool.size / 2,
            };
            this.brushMarker = this.tool.form === 'circle' ? new fabric.Circle({
                ...common,
                radius: this.tool.size / 2,
            }) : new fabric.Rect({
                ...common,
                width: this.tool.size,
                height: this.tool.size,
            });

            this.canvas.add(this.brushMarker);
        }
    }

    private releasePaste(): void {
        this.canvas.clear();
        this.canvas.renderAll();
        this.canvas.getElement().parentElement.style.display = '';
        this.isInsertion = false;
        this.drawnObjects = [];
        this.onDrawDone(null);
    }

    private releaseDraw(): void {
        this.removeBrushMarker();
        this.canvas.clear();
        this.canvas.renderAll();
        this.canvas.getElement().parentElement.style.display = '';
        this.isDrawing = false;
        this.redraw = null;
        this.drawnObjects = [];
        this.onDrawDone(null);
        if (this.drawablePolygon) {
            this.drawablePolygon = null;
        }
    }

    private releaseEdit(): void {
        this.removeBrushMarker();
        this.canvas.clear();
        this.canvas.renderAll();
        this.canvas.getElement().parentElement.style.display = '';
        this.isEditing = false;
        this.drawnObjects = [];
        this.onEditDone(null, null);
    }

    private getStateColor(state: any): string {
        if (this.colorBy === 'Instance') {
            return state.color;
        }

        if (this.colorBy === 'Label') {
            return state.label.color;
        }

        return state.group.color;
    }

    private getDrawnObjectsWrappingBox(): WrappingBBox {
        type BoundingRect = ReturnType<PropType<fabric.Polygon, 'getBoundingRect'>>;
        type TwoCornerBox = Pick<BoundingRect, 'top' | 'left'> & { right: number; bottom: number };
        const { width, height } = this.geometry.image;
        const wrappingBbox = this.drawnObjects
            .map((obj) => {
                if (obj instanceof fabric.Polygon) {
                    const bbox = computeWrappingBox(obj.points
                        .reduce(((acc, val) => {
                            acc.push(val.x, val.y);
                            return acc;
                        }), []));

                    return {
                        left: bbox.xtl,
                        top: bbox.ytl,
                        width: bbox.width,
                        height: bbox.height,
                    };
                }

                if (obj instanceof fabric.Image) {
                    return {
                        left: obj.left,
                        top: obj.top,
                        width: obj.width,
                        height: obj.height,
                    };
                }

                return obj.getBoundingRect();
            })
            .reduce((acc: TwoCornerBox, rect: BoundingRect) => {
                acc.top = Math.floor(Math.max(0, Math.min(rect.top, acc.top)));
                acc.left = Math.floor(Math.max(0, Math.min(rect.left, acc.left)));
                acc.bottom = Math.floor(Math.min(height, Math.max(rect.top + rect.height, acc.bottom)));
                acc.right = Math.floor(Math.min(width, Math.max(rect.left + rect.width, acc.right)));
                return acc;
            }, {
                left: Number.MAX_SAFE_INTEGER,
                top: Number.MAX_SAFE_INTEGER,
                right: Number.MIN_SAFE_INTEGER,
                bottom: Number.MIN_SAFE_INTEGER,
            });

        return wrappingBbox;
    }

    private imageDataFromCanvas(wrappingBBox: WrappingBBox): Uint8ClampedArray {
        const imageData = this.canvas.toCanvasElement()
            .getContext('2d').getImageData(
                wrappingBBox.left, wrappingBBox.top,
                wrappingBBox.right - wrappingBBox.left + 1, wrappingBBox.bottom - wrappingBBox.top + 1,
            ).data;
        return imageData;
    }

    private updateBrushTools(brushTool: BrushTool, opts: Partial<BrushTool> = {}): void {
        if (this.tool?.type.startsWith('polygon-') && this.drawablePolygon && brushTool.type !== this.tool.type) {
            // tool was switched from polygon to brush for example
            this.keepDrawnPolygon();
        }

        this.tool = { ...brushTool, ...opts };

        // setup new brush marker
        this.removeBrushMarker();
        if (this.isDrawing || this.isEditing) {
            this.setupBrushMarker();
        }
    }

    public constructor(
        onDrawDone: (
            data: object | null,
            duration?: number,
            continueDraw?: boolean,
            prevDrawData?: DrawData,
        ) => void,
        onDrawRepeat: (data: DrawData) => void,
        onEditStart: (state: any) => void,
        onEditDone: (state: any, points: number[]) => void,
        canvas: HTMLCanvasElement,
    ) {
        this.redraw = null;
        this.isDrawing = false;
        this.isEditing = false;
        this.isMouseDown = false;
        this.isBrushSizeChanging = false;
        this.drawData = null;
        this.editData = null;
        this.drawnObjects = [];
        this.drawingOpacity = 0.5;
        this.brushMarker = null;
        this.colorBy = 'Instance';
        this.onDrawDone = onDrawDone;
        this.onDrawRepeat = onDrawRepeat;
        this.onEditDone = onEditDone;
        this.onEditStart = onEditStart;
        this.canvas = new fabric.Canvas(canvas, { containerClass: 'cvat_masks_canvas_wrapper', fireRightClick: true, selection: false });
        this.canvas.imageSmoothingEnabled = false;

        this.canvas.getElement().parentElement.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());
        this.latestMousePos = { x: -1, y: -1 };
        window.document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.isBrushSizeChanging = false;
        });

        this.canvas.on('mouse:dblclick', (e: fabric.IEvent<MouseEvent>) => {
            if (this.drawablePolygon) {
                // removed the latest two points just added
                // here we remove only one point, one more point will be removed in keepDrawnPolygon
                const points = this.drawablePolygon.get('points').slice(0, -1);
                this.drawablePolygon.set('points', points);
                this.keepDrawnPolygon();
                e.e.stopPropagation();
            }
        });

        this.canvas.on('mouse:down', (options: fabric.IEvent<MouseEvent>) => {
            const {
                tool, isDrawing, isEditing, isInsertion,
            } = this;
            const point = new fabric.Point(options.pointer.x, options.pointer.y);
            this.isMouseDown = (isDrawing || isEditing) && options.e.button === 0 && !options.e.altKey;
            this.isBrushSizeChanging = (isDrawing || isEditing) && options.e.button === 2 && options.e.altKey;

            if (isInsertion) {
                const continueInserting = options.e.ctrlKey;
                const wrappingBbox = this.getDrawnObjectsWrappingBox();
                const imageData = this.imageDataFromCanvas(wrappingBbox);
                const alpha = alphaChannelOnly(imageData);
                alpha.push(wrappingBbox.left, wrappingBbox.top, wrappingBbox.right, wrappingBbox.bottom);

                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
                    points: alpha,
                }, Date.now() - this.startTimestamp, continueInserting, this.drawData);

                if (!continueInserting) {
                    this.releasePaste();
                }
                return;
            }

            if (this.drawablePolygon) {
                // update polygon if drawing has been started
                if (options.e.button === 2) {
                    // remove the latest point
                    const points = this.drawablePolygon.get('points');
                    if (points.length > 2) { // at least three points including sliding point
                        points.splice(points.length - 1, 1);
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
            } else if ((isDrawing || isEditing) && tool.type.startsWith('polygon-')) {
                // create a new polygon
                this.drawablePolygon = new fabric.Polygon([point, fabric.util.object.clone(point)], {
                    opacity: this.drawingOpacity,
                    strokeWidth: consts.BASE_STROKE_WIDTH / this.geometry.scale,
                    stroke: 'black',
                    fill: tool.type === 'polygon-minus' ? 'white' : (tool.color || 'white'),
                    selectable: false,
                    objectCaching: false,
                    absolutePositioned: true,
                });

                this.canvas.add(this.drawablePolygon);
                this.canvas.renderAll();
            }
        });

        this.canvas.on('mouse:move', (e: fabric.IEvent<MouseEvent>) => {
            let { image: { width: imageWidth, height: imageHeight } } = this.geometry;
            const { angle } = this.geometry;
            let [x, y] = [e.pointer.x, e.pointer.y];
            if (angle === 180) {
                [x, y] = rotate2DPoints(imageWidth / 2, imageHeight / 2, -angle, [x, y]);
            } else if (angle) {
                // TODO: find a solution
                // [x, y] = [(x / this.canvas.width) * imageWidth, (y / this.canvas.height) * imageHeight];
                // [x, y] = [y, x];
                // [x, y] = rotate2DPoints(imageWidth / 2, imageHeight / 2, -angle, [x, y]);
            }

            const position = { x, y };
            const {
                tool, isMouseDown, isInsertion, isBrushSizeChanging,
            } = this;

            if (isInsertion) {
                const [object] = this.drawnObjects;
                if (object && object instanceof fabric.Image) {
                    object.left = position.x - object.width / 2;
                    object.top = position.y - object.height / 2;
                    this.canvas.renderAll();
                }
            }

            if (isBrushSizeChanging && ['brush', 'eraser'].includes(this.tool?.type)) {
                const xDiff = position.x - this.resizeBrushToolLatestX;
                let onUpdateConfiguration = null;
                if (this.isDrawing) {
                    onUpdateConfiguration = this.drawData.onUpdateConfiguration;
                } else if (this.isEditing) {
                    onUpdateConfiguration = this.editData.onUpdateConfiguration;
                }
                if (onUpdateConfiguration) {
                    onUpdateConfiguration({
                        brushTool: {
                            size: Math.trunc(Math.max(1, this.tool.size + xDiff)),
                        },
                    });
                }

                this.resizeBrushToolLatestX = position.x;
                e.e.stopPropagation();
                return;
            }

            if (this.brushMarker) {
                this.brushMarker.left = position.x - tool.size / 2;
                this.brushMarker.top = position.y - tool.size / 2;
                this.canvas.bringToFront(this.brushMarker);
                this.canvas.renderAll();
            }

            if (isMouseDown && !isBrushSizeChanging && ['brush', 'eraser'].includes(tool.type)) {
                const color = fabric.Color.fromHex(tool.color);
                color.setAlpha(tool.type === 'eraser' ? 1 : 0.5);

                const commonProperties = {
                    selectable: false,
                    evented: false,
                    globalCompositeOperation: tool.type === 'eraser' ? 'destination-out' : 'xor',
                };

                const shapeProperties = {
                    ...commonProperties,
                    fill: color.toRgba(),
                    left: position.x - tool.size / 2,
                    top: position.y - tool.size / 2,
                };

                let shape: fabric.Circle | fabric.Rect | null = null;
                if (tool.form === 'circle') {
                    shape = new fabric.Circle({
                        ...shapeProperties,
                        radius: tool.size / 2,
                    });
                } else if (tool.form === 'square') {
                    shape = new fabric.Rect({
                        ...shapeProperties,
                        width: tool.size,
                        height: tool.size,
                    });
                }

                this.canvas.add(shape);
                if (tool.type === 'brush') {
                    this.drawnObjects.push(shape);
                }

                // add line to smooth the mask
                if (this.latestMousePos.x !== -1 && this.latestMousePos.y !== -1) {
                    const dx = position.x - this.latestMousePos.x;
                    const dy = position.y - this.latestMousePos.y;
                    if (Math.sqrt(dx ** 2 + dy ** 2) > tool.size / 2) {
                        const line = new fabric.Line([
                            this.latestMousePos.x - tool.size / 2,
                            this.latestMousePos.y - tool.size / 2,
                            position.x - tool.size / 2,
                            position.y - tool.size / 2,
                        ], {
                            ...commonProperties,
                            stroke: color.toRgba(),
                            strokeWidth: tool.size,
                            strokeLineCap: tool.form === 'circle' ? 'round' : 'square',
                        });

                        this.canvas.add(line);
                        if (tool.type === 'brush') {
                            this.drawnObjects.push(line);
                        }
                    }
                }
                this.canvas.renderAll();
            } else if (this.tool.type.startsWith('polygon-') && this.drawablePolygon) {
                // update the polygon position
                const points = this.drawablePolygon.get('points');
                if (points.length) {
                    points[points.length - 1].setX(e.e.offsetX);
                    points[points.length - 1].setY(e.e.offsetY);
                }
                this.canvas.renderAll();
            }

            this.latestMousePos.x = position.x;
            this.latestMousePos.y = position.y;
            this.resizeBrushToolLatestX = position.x;
        });
    }

    public configurate(configuration: Configuration): void {
        this.colorBy = configuration.colorBy;
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        const {
            scale, angle, image: { width, height }, top, left,
        } = geometry;

        const topCanvas = this.canvas.getElement().parentElement as HTMLDivElement;
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.setHeight(height);
            this.canvas.setWidth(width);
            this.canvas.setDimensions({ width, height });
        }

        topCanvas.style.top = `${top}px`;
        topCanvas.style.left = `${left}px`;
        topCanvas.style.transform = `scale(${scale}) rotate(${angle}deg)`;

        if (this.drawablePolygon) {
            this.drawablePolygon.set('strokeWidth', consts.BASE_STROKE_WIDTH / scale);
            this.canvas.renderAll();
        }
    }

    public draw(drawData: DrawData): void {
        if (drawData.brushTool) {
            this.updateBrushTools(drawData.brushTool);
        }

        if (drawData.enabled && drawData.shapeType === 'mask') {
            if (!this.isInsertion && drawData.initialState?.shapeType === 'mask') {
                // initialize inserting pipeline if not started
                const { points } = drawData.initialState;
                const color = fabric.Color.fromHex(this.getStateColor(drawData.initialState)).getSource();
                const [left, top, right, bottom] = points.splice(-4);
                const imageBitmap = expandChannels(color[0], color[1], color[2], points);
                imageDataToDataURL(imageBitmap, right - left + 1, bottom - top + 1,
                    (dataURL: string) => new Promise((resolve) => {
                        fabric.Image.fromURL(dataURL, (image: fabric.Image) => {
                            try {
                                image.selectable = false;
                                image.evented = false;
                                image.globalCompositeOperation = 'xor';
                                image.opacity = 0.5;
                                // image.left = this.latestMousePos.x - image.width / 2;
                                // image.top = this.latestMousePos.y - image.height / 2;
                                this.canvas.add(image);
                                this.drawnObjects.push(image);
                                this.canvas.renderAll();
                            } finally {
                                resolve();
                            }
                        }, { left, top });
                    }));

                this.isInsertion = true;
            } else if (!this.isDrawing) {
                // initialize drawing pipeline if not started
                this.isDrawing = true;
                this.redraw = drawData.redraw || null;
            }

            this.canvas.getElement().parentElement.style.display = 'block';
            this.startTimestamp = Date.now();
        } else if (this.isDrawing) {
            try {
                // drawing has been finished
                this.removeBrushMarker();
                if (this.drawablePolygon) {
                    this.keepDrawnPolygon();
                }

                // TODO: make a smarter validation
                if (this.drawnObjects.length) {
                    const wrappingBbox = this.getDrawnObjectsWrappingBox();
                    const imageData = this.imageDataFromCanvas(wrappingBbox);
                    const alpha = alphaChannelOnly(imageData);
                    alpha.push(wrappingBbox.left, wrappingBbox.top, wrappingBbox.right, wrappingBbox.bottom);
                    this.onDrawDone({
                        shapeType: this.drawData.shapeType,
                        points: alpha,
                        ...(Number.isInteger(this.redraw) ? { clientID: this.redraw } : {}),
                    }, Date.now() - this.startTimestamp, drawData.continue, this.drawData);
                }
            } finally {
                this.releaseDraw();
            }

            if (drawData.continue) {
                const newDrawData = {
                    ...this.drawData,
                    brushTool: { ...this.tool },
                    ...drawData,
                    enabled: true,
                    shapeType: 'mask',
                };
                this.onDrawRepeat(newDrawData);
                return;
            }
        }

        this.drawData = drawData;
    }

    public edit(editData: MasksEditData): void {
        if (editData.brushTool && editData.state) {
            this.updateBrushTools(
                editData.brushTool,
                { color: this.getStateColor(this.editData.state) },
            );
        }

        if (editData.enabled && editData.state.shapeType === 'mask') {
            if (!this.isEditing) {
                // start editing pipeline if not started yet
                this.canvas.getElement().parentElement.style.display = 'block';
                const { points } = editData.state;
                const color = fabric.Color.fromHex(this.getStateColor(editData.state)).getSource();
                const [left, top, right, bottom] = points.splice(-4);
                const imageBitmap = expandChannels(color[0], color[1], color[2], points);
                imageDataToDataURL(imageBitmap, right - left + 1, bottom - top + 1,
                    (dataURL: string) => new Promise((resolve) => {
                        fabric.Image.fromURL(dataURL, (image: fabric.Image) => {
                            try {
                                image.selectable = false;
                                image.evented = false;
                                image.globalCompositeOperation = 'xor';
                                image.opacity = 0.5;
                                this.canvas.add(image);
                                this.drawnObjects.push(image);
                                this.canvas.renderAll();
                            } finally {
                                resolve();
                            }
                        }, { left, top });
                    }));

                this.isEditing = true;
                this.startTimestamp = Date.now();
                this.onEditStart(editData.state);
            }
        } else if (!editData.enabled) {
            try {
                // editing has been finished
                this.removeBrushMarker();
                if (this.drawablePolygon) {
                    this.keepDrawnPolygon();
                }

                if (this.drawnObjects.length) {
                    const wrappingBbox = this.getDrawnObjectsWrappingBox();
                    const imageData = this.imageDataFromCanvas(wrappingBbox);
                    const alpha = alphaChannelOnly(imageData);
                    alpha.push(wrappingBbox.left, wrappingBbox.top, wrappingBbox.right, wrappingBbox.bottom);
                    this.onEditDone(this.editData.state, alpha);
                }
            } finally {
                this.releaseEdit();
            }
        }
        this.editData = editData;
    }

    get enabled(): boolean {
        return this.isDrawing || this.isEditing || this.isInsertion;
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
