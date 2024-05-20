// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';
import debounce from 'lodash/debounce';

import {
    DrawData, MasksEditData, Geometry, Configuration, BrushTool, ColorBy,
} from './canvasModel';
import consts from './consts';
import { DrawHandler } from './drawHandler';
import {
    PropType, computeWrappingBox, zipChannels, expandChannels, imageDataToDataURL,
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
    private vectorDrawHandler: DrawHandler;

    private redraw: number | null;
    private isDrawing: boolean;
    private isEditing: boolean;
    private isInsertion: boolean;
    private isMouseDown: boolean;
    private isBrushSizeChanging: boolean;
    private resizeBrushToolLatestX: number;
    private brushMarker: fabric.Rect | fabric.Circle | null;
    private drawablePolygon: null | fabric.Polygon;
    private isPolygonDrawing: boolean;
    private drawnObjects: (fabric.Polygon | fabric.Circle | fabric.Rect | fabric.Line | fabric.Image)[];

    private tool: DrawData['brushTool'] | null;
    private drawData: DrawData | null;
    private canvas: fabric.Canvas;

    private editData: MasksEditData | null;

    private colorBy: ColorBy;
    private latestMousePos: { x: number; y: number; };
    private startTimestamp: number;
    private geometry: Geometry;
    private drawingOpacity: number;

    private keepDrawnPolygon(): void {
        const canvasWrapper = this.canvas.getElement().parentElement;
        canvasWrapper.style.pointerEvents = '';
        canvasWrapper.style.zIndex = '';
        this.isPolygonDrawing = false;
        this.vectorDrawHandler.draw({ enabled: false }, this.geometry);
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
                strokeWidth: 1,
                stroke: 'white',
            };
            this.brushMarker = this.tool.form === 'circle' ? new fabric.Circle({
                ...common,
                radius: Math.round(this.tool.size / 2),
            }) : new fabric.Rect({
                ...common,
                width: this.tool.size,
                height: this.tool.size,
            });

            this.canvas.defaultCursor = 'none';
            this.canvas.add(this.brushMarker);
        } else {
            this.canvas.defaultCursor = 'inherit';
        }
    }

    private releaseCanvasWrapperCSS(): void {
        const canvasWrapper = this.canvas.getElement().parentElement;
        canvasWrapper.style.pointerEvents = '';
        canvasWrapper.style.zIndex = '';
        canvasWrapper.style.display = '';
    }

    private releasePaste(): void {
        this.releaseCanvasWrapperCSS();
        this.canvas.clear();
        this.canvas.renderAll();
        this.isInsertion = false;
        this.drawnObjects = this.createDrawnObjectsArray();
        this.onDrawDone(null);
    }

    private releaseDraw(): void {
        this.removeBrushMarker();
        this.releaseCanvasWrapperCSS();
        if (this.isPolygonDrawing) {
            this.isPolygonDrawing = false;
            this.vectorDrawHandler.cancel();
        }
        this.canvas.clear();
        this.canvas.renderAll();
        this.isDrawing = false;
        this.isInsertion = false;
        this.redraw = null;
        this.drawnObjects = this.createDrawnObjectsArray();
    }

    private releaseEdit(): void {
        this.removeBrushMarker();
        this.releaseCanvasWrapperCSS();
        if (this.isPolygonDrawing) {
            this.isPolygonDrawing = false;
            this.vectorDrawHandler.cancel();
        }
        this.canvas.clear();
        this.canvas.renderAll();
        this.isEditing = false;
        this.drawnObjects = this.createDrawnObjectsArray();
        this.onEditDone(null, null);
    }

    private getStateColor(state: any): string {
        if (this.colorBy === ColorBy.INSTANCE) {
            return state.color;
        }

        if (this.colorBy === ColorBy.LABEL) {
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
                acc.bottom = Math.floor(Math.min(height - 1, Math.max(rect.top + rect.height, acc.bottom)));
                acc.right = Math.floor(Math.min(width - 1, Math.max(rect.left + rect.width, acc.right)));
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

    private updateBrushTools(brushTool?: BrushTool, opts: Partial<BrushTool> = {}): void {
        if (this.isPolygonDrawing) {
            // tool was switched from polygon to brush for example
            this.keepDrawnPolygon();
        }

        this.removeBrushMarker();
        if (brushTool) {
            if (brushTool.color && this.tool?.color !== brushTool.color) {
                const color = fabric.Color.fromHex(brushTool.color);
                for (const object of this.drawnObjects) {
                    if (object instanceof fabric.Line) {
                        const alpha = +object.stroke.split(',')[3].slice(0, -1);
                        color.setAlpha(alpha);
                        object.set({ stroke: color.toRgba() });
                    } else if (
                        object instanceof fabric.Rect ||
                        object instanceof fabric.Polygon ||
                        object instanceof fabric.Circle
                    ) {
                        const alpha = +(object.fill as string).split(',')[3].slice(0, -1);
                        color.setAlpha(alpha);
                        (object as fabric.Object).set({ fill: color.toRgba() });
                    }
                }
                this.canvas.renderAll();
            }

            this.tool = { ...brushTool, ...opts };
            if (this.isDrawing || this.isEditing) {
                this.setupBrushMarker();
            }

            this.updateBlockedTools();
        }

        if (this.tool?.type?.startsWith('polygon-')) {
            this.isPolygonDrawing = true;
            this.vectorDrawHandler.draw({
                enabled: true,
                shapeType: 'polygon',
                onDrawDone: (data: { points: number[] } | null) => {
                    if (!data) return;
                    const points = data.points.reduce((acc: fabric.Point[], _: number, idx: number) => {
                        if (idx % 2) {
                            acc.push(new fabric.Point(data.points[idx - 1], data.points[idx]));
                        }

                        return acc;
                    }, []);

                    const color = fabric.Color.fromHex(this.tool.color);
                    color.setAlpha(this.tool.type === 'polygon-minus' ? 1 : this.drawingOpacity);
                    const polygon = new fabric.Polygon(points, {
                        fill: color.toRgba(),
                        selectable: false,
                        objectCaching: false,
                        absolutePositioned: true,
                        globalCompositeOperation: this.tool.type === 'polygon-minus' ? 'destination-out' : 'xor',
                    });

                    this.canvas.add(polygon);
                    this.drawnObjects.push(polygon);
                    this.canvas.renderAll();
                },
            }, this.geometry);

            const canvasWrapper = this.canvas.getElement().parentElement as HTMLDivElement;
            canvasWrapper.style.pointerEvents = 'none';
            canvasWrapper.style.zIndex = '0';
        }
    }

    private updateBlockedTools(): void {
        if (this.drawnObjects.length === 0) {
            this.tool.onBlockUpdated({
                eraser: true,
                'polygon-minus': true,
            });
            return;
        }
        const wrappingBbox = this.getDrawnObjectsWrappingBox();
        if (this.brushMarker) {
            this.canvas.remove(this.brushMarker);
        }
        const imageData = this.imageDataFromCanvas(wrappingBbox);
        if (this.brushMarker) {
            this.canvas.add(this.brushMarker);
        }
        const rle = zipChannels(imageData);
        const emptyMask = rle.length < 2;
        this.tool.onBlockUpdated({
            eraser: emptyMask,
            'polygon-minus': emptyMask,
        });
    }

    private createDrawnObjectsArray(): MasksHandlerImpl['drawnObjects'] {
        const drawnObjects = [];
        const updateBlockedToolsDebounced = debounce(this.updateBlockedTools.bind(this), 250);
        return new Proxy(drawnObjects, {
            set(target, property, value) {
                target[property] = value;
                updateBlockedToolsDebounced();
                return true;
            },
        });
    }

    public constructor(
        onDrawDone: MasksHandlerImpl['onDrawDone'],
        onDrawRepeat: MasksHandlerImpl['onDrawRepeat'],
        onEditStart: MasksHandlerImpl['onEditStart'],
        onEditDone: MasksHandlerImpl['onEditDone'],
        vectorDrawHandler: DrawHandler,
        canvas: HTMLCanvasElement,
    ) {
        this.redraw = null;
        this.isDrawing = false;
        this.isEditing = false;
        this.isMouseDown = false;
        this.isBrushSizeChanging = false;
        this.isPolygonDrawing = false;
        this.drawData = null;
        this.editData = null;
        this.drawingOpacity = 0.5;
        this.brushMarker = null;
        this.colorBy = ColorBy.LABEL;
        this.onDrawDone = onDrawDone;
        this.onDrawRepeat = onDrawRepeat;
        this.onEditDone = onEditDone;
        this.onEditStart = onEditStart;
        this.vectorDrawHandler = vectorDrawHandler;
        this.canvas = new fabric.Canvas(canvas, {
            containerClass: 'cvat_masks_canvas_wrapper',
            fireRightClick: true,
            selection: false,
            defaultCursor: 'inherit',
        });
        this.canvas.imageSmoothingEnabled = false;
        this.drawnObjects = this.createDrawnObjectsArray();

        this.canvas.getElement().parentElement.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());
        this.latestMousePos = { x: -1, y: -1 };
        window.document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.isBrushSizeChanging = false;
        });

        this.canvas.on('mouse:down', (options: fabric.IEvent<MouseEvent>) => {
            const { isDrawing, isEditing, isInsertion } = this;
            this.isMouseDown = (isDrawing || isEditing) && options.e.button === 0 && !options.e.altKey;
            this.isBrushSizeChanging = (isDrawing || isEditing) && options.e.button === 2 && options.e.altKey;

            if (isInsertion) {
                const continueInserting = options.e.ctrlKey;
                const wrappingBbox = this.getDrawnObjectsWrappingBox();
                const imageData = this.imageDataFromCanvas(wrappingBbox);
                const rle = zipChannels(imageData);
                rle.push(wrappingBbox.left, wrappingBbox.top, wrappingBbox.right, wrappingBbox.bottom);

                this.onDrawDone({
                    shapeType: this.drawData.shapeType,
                    points: rle,
                    label: this.drawData.initialState.label,
                }, Date.now() - this.startTimestamp, continueInserting, this.drawData);

                if (!continueInserting) {
                    this.releasePaste();
                }
            } else {
                this.canvas.fire('mouse:move', options);
            }
        });

        this.canvas.on('mouse:move', (e: fabric.IEvent<MouseEvent>) => {
            const { image: { width: imageWidth, height: imageHeight } } = this.geometry;
            const { angle } = this.geometry;
            let [x, y] = [e.pointer.x, e.pointer.y];
            if (angle === 180) {
                [x, y] = [imageWidth - x, imageHeight - y];
            } else if (angle === 270) {
                [x, y] = [imageWidth - (y / imageHeight) * imageWidth, (x / imageWidth) * imageHeight];
            } else if (angle === 90) {
                [x, y] = [(y / imageHeight) * imageWidth, imageHeight - (x / imageWidth) * imageHeight];
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

            if (isBrushSizeChanging && ['brush', 'eraser'].includes(tool?.type)) {
                const xDiff = e.pointer.x - this.resizeBrushToolLatestX;
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

                this.resizeBrushToolLatestX = e.pointer.x;
                e.e.stopPropagation();
                return;
            }

            if (this.brushMarker) {
                this.brushMarker.left = position.x - tool.size / 2;
                this.brushMarker.top = position.y - tool.size / 2;
                this.canvas.bringToFront(this.brushMarker);
                this.canvas.renderAll();
            }

            if (isMouseDown && !isBrushSizeChanging && ['brush', 'eraser'].includes(tool?.type)) {
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
                        radius: Math.round(tool.size / 2),
                    });
                } else if (tool.form === 'square') {
                    shape = new fabric.Rect({
                        ...shapeProperties,
                        width: tool.size,
                        height: tool.size,
                    });
                }

                this.canvas.add(shape);
                if (['brush', 'eraser'].includes(tool?.type)) {
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
                        if (['brush', 'eraser'].includes(tool?.type)) {
                            this.drawnObjects.push(line);
                        }
                    }
                }
                this.canvas.renderAll();
            } else if (tool?.type.startsWith('polygon-') && this.drawablePolygon) {
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
        if (drawData.enabled && drawData.shapeType === 'mask') {
            if (!this.isInsertion && drawData.initialState?.shapeType === 'mask') {
                // initialize inserting pipeline if not started
                const { points } = drawData.initialState;
                const color = fabric.Color.fromHex(this.getStateColor(drawData.initialState)).getSource();
                const [left, top, right, bottom] = points.slice(-4);
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
                                /*
                                    when we paste a mask, we do not need additional logic implemented
                                    in MasksHandlerImpl::createDrawnObjectsArray.push using JS Proxy
                                    because we will not work with any drawing tools here, and it will cause the issue
                                    because this.tools may be undefined here
                                    when it is used inside the push custom implementation
                                */
                                this.drawnObjects = [image];
                                this.canvas.renderAll();
                            } finally {
                                resolve();
                            }
                        }, { left, top });
                    }));

                this.isInsertion = true;
            } else {
                this.updateBrushTools(drawData.brushTool);
                if (!this.isDrawing) {
                    // initialize drawing pipeline if not started
                    this.isDrawing = true;
                    this.redraw = drawData.redraw || null;
                }
            }

            this.canvas.getElement().parentElement.style.display = 'block';
            this.startTimestamp = Date.now();
        }

        if (!drawData.enabled && this.isDrawing) {
            try {
                if (this.drawnObjects.length) {
                    const wrappingBbox = this.getDrawnObjectsWrappingBox();
                    this.removeBrushMarker(); // remove brush marker from final mask
                    const imageData = this.imageDataFromCanvas(wrappingBbox);
                    const rle = zipChannels(imageData);
                    rle.push(wrappingBbox.left, wrappingBbox.top, wrappingBbox.right, wrappingBbox.bottom);

                    const isEmptyMask = rle.length < 6;
                    if (isEmptyMask) {
                        this.onDrawDone(null);
                    } else {
                        this.onDrawDone({
                            shapeType: this.drawData.shapeType,
                            points: rle,
                            ...(Number.isInteger(this.redraw) ? { clientID: this.redraw } : {}),
                        }, Date.now() - this.startTimestamp, drawData.continue, this.drawData);
                    }
                } else {
                    this.onDrawDone(null);
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

                this.onDrawRepeat({ enabled: true, shapeType: 'mask' });
                this.onDrawRepeat(newDrawData);
                return;
            }
        }

        this.drawData = drawData;
    }

    public edit(editData: MasksEditData): void {
        if (editData.enabled && editData.state.shapeType === 'mask') {
            if (!this.isEditing) {
                // start editing pipeline if not started yet
                this.canvas.getElement().parentElement.style.display = 'block';
                const { points } = editData.state;
                const color = fabric.Color.fromHex(this.getStateColor(editData.state)).getSource();
                const [left, top, right, bottom] = points.slice(-4);
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
        }

        this.updateBrushTools(
            editData.brushTool,
            editData.state ? { color: this.getStateColor(editData.state) } : {},
        );

        if (!editData.enabled && this.isEditing) {
            try {
                if (this.drawnObjects.length) {
                    const wrappingBbox = this.getDrawnObjectsWrappingBox();
                    this.removeBrushMarker(); // remove brush marker from final mask
                    const imageData = this.imageDataFromCanvas(wrappingBbox);
                    const rle = zipChannels(imageData);
                    rle.push(wrappingBbox.left, wrappingBbox.top, wrappingBbox.right, wrappingBbox.bottom);
                    const isEmptyMask = rle.length < 6;
                    if (isEmptyMask) {
                        this.onEditDone(null, null);
                    } else {
                        this.onEditDone(this.editData.state, rle);
                    }
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
        if (this.isDrawing || this.isInsertion) {
            this.releaseDraw();
        }

        if (this.isEditing) {
            this.releaseEdit();
        }
    }
}
