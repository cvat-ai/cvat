// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { MasterImpl } from './master';

export interface Size {
    width: number;
    height: number;
}

export interface Image {
    renderWidth: number;
    renderHeight: number;
    imageData: ImageData | CanvasImageSource;
}

export interface Position {
    x: number;
    y: number;
}

export interface Geometry {
    image: Size;
    canvas: Size;
    grid: Size;
    top: number;
    left: number;
    scale: number;
    offset: number;
    angle: number;
}

export interface FocusData {
    clientID: number;
    padding: number;
}

export interface ActiveElement {
    clientID: number | null;
    attributeID: number | null;
}

export enum RectDrawingMethod {
    CLASSIC = 'By 2 points',
    EXTREME_POINTS = 'By 4 points',
}

export enum CuboidDrawingMethod {
    CLASSIC = 'From rectangle',
    CORNER_POINTS = 'By 4 points',
}

export interface Configuration {
    autoborders?: boolean;
    displayAllText?: boolean;
    undefinedAttrValue?: string;
    showProjections?: boolean;
}

export interface DrawData {
    enabled: boolean;
    shapeType?: string;
    rectDrawingMethod?: RectDrawingMethod;
    cuboidDrawingMethod?: CuboidDrawingMethod;
    numberOfPoints?: number;
    initialState?: any;
    crosshair?: boolean;
    redraw?: number;
}

export interface InteractionData {
    enabled: boolean;
    shapeType?: string;
    crosshair?: boolean;
    minPosVertices?: number;
    minNegVertices?: number;
}

export interface InteractionResult {
    points: number[];
    shapeType: string;
    button: number;
}

export interface EditData {
    enabled: boolean;
    state: any;
    pointID: number;
}

export interface GroupData {
    enabled: boolean;
}

export interface MergeData {
    enabled: boolean;
}

export interface SplitData {
    enabled: boolean;
}

export enum FrameZoom {
    MIN = 0.1,
    MAX = 10,
}

export enum UpdateReasons {
    IMAGE_CHANGED = 'image_changed',
    IMAGE_ZOOMED = 'image_zoomed',
    IMAGE_FITTED = 'image_fitted',
    IMAGE_MOVED = 'image_moved',
    GRID_UPDATED = 'grid_updated',

    OBJECTS_UPDATED = 'objects_updated',
    SHAPE_ACTIVATED = 'shape_activated',
    SHAPE_FOCUSED = 'shape_focused',

    FITTED_CANVAS = 'fitted_canvas',

    INTERACT = 'interact',
    DRAW = 'draw',
    MERGE = 'merge',
    SPLIT = 'split',
    GROUP = 'group',
    SELECT = 'select',
    CANCEL = 'cancel',
    BITMAP = 'bitmap',
    DRAG_CANVAS = 'drag_canvas',
    ZOOM_CANVAS = 'zoom_canvas',
    CONFIG_UPDATED = 'config_updated',
}

export enum Mode {
    IDLE = 'idle',
    DRAG = 'drag',
    RESIZE = 'resize',
    DRAW = 'draw',
    EDIT = 'edit',
    MERGE = 'merge',
    SPLIT = 'split',
    GROUP = 'group',
    INTERACT = 'interact',
    DRAG_CANVAS = 'drag_canvas',
    ZOOM_CANVAS = 'zoom_canvas',
}

export interface CanvasModel {
    readonly imageBitmap: boolean;
    readonly image: Image | null;
    readonly objects: any[];
    readonly zLayer: number | null;
    readonly gridSize: Size;
    readonly focusData: FocusData;
    readonly activeElement: ActiveElement;
    readonly drawData: DrawData;
    readonly interactionData: InteractionData;
    readonly mergeData: MergeData;
    readonly splitData: SplitData;
    readonly groupData: GroupData;
    readonly configuration: Configuration;
    readonly selected: any;
    geometry: Geometry;
    mode: Mode;

    zoom(x: number, y: number, direction: number): void;
    move(topOffset: number, leftOffset: number): void;

    setup(frameData: any, objectStates: any[], zLayer: number): void;
    activate(clientID: number | null, attributeID: number | null): void;
    rotate(rotationAngle: number): void;
    focus(clientID: number, padding: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    draw(drawData: DrawData): void;
    group(groupData: GroupData): void;
    split(splitData: SplitData): void;
    merge(mergeData: MergeData): void;
    select(objectState: any): void;
    interact(interactionData: InteractionData): void;

    fitCanvas(width: number, height: number): void;
    bitmap(enabled: boolean): void;
    dragCanvas(enable: boolean): void;
    zoomCanvas(enable: boolean): void;

    isAbleToChangeFrame(): boolean;
    configure(configuration: Configuration): void;
    cancel(): void;
}

export class CanvasModelImpl extends MasterImpl implements CanvasModel {
    private data: {
        activeElement: ActiveElement;
        angle: number;
        canvasSize: Size;
        configuration: Configuration;
        imageBitmap: boolean;
        image: Image | null;
        imageID: number | null;
        imageOffset: number;
        imageSize: Size;
        focusData: FocusData;
        gridSize: Size;
        left: number;
        objects: any[];
        scale: number;
        top: number;
        zLayer: number | null;
        drawData: DrawData;
        interactionData: InteractionData;
        mergeData: MergeData;
        groupData: GroupData;
        splitData: SplitData;
        selected: any;
        mode: Mode;
    };

    public constructor() {
        super();

        this.data = {
            activeElement: {
                clientID: null,
                attributeID: null,
            },
            angle: 0,
            canvasSize: {
                height: 0,
                width: 0,
            },
            configuration: {
                displayAllText: false,
                autoborders: false,
                undefinedAttrValue: '',
            },
            imageBitmap: false,
            image: null,
            imageID: null,
            imageOffset: 0,
            imageSize: {
                height: 0,
                width: 0,
            },
            focusData: {
                clientID: 0,
                padding: 0,
            },
            gridSize: {
                height: 100,
                width: 100,
            },
            left: 0,
            objects: [],
            scale: 1,
            top: 0,
            zLayer: null,
            drawData: {
                enabled: false,
                initialState: null,
            },
            interactionData: {
                enabled: false,
            },
            mergeData: {
                enabled: false,
            },
            groupData: {
                enabled: false,
            },
            splitData: {
                enabled: false,
            },
            selected: null,
            mode: Mode.IDLE,
        };
    }

    public zoom(x: number, y: number, direction: number): void {
        const oldScale: number = this.data.scale;
        const newScale: number = direction > 0 ? (oldScale * 6) / 5 : (oldScale * 5) / 6;
        this.data.scale = Math.min(Math.max(newScale, FrameZoom.MIN), FrameZoom.MAX);

        const { angle } = this.data;

        const mutiplier = Math.sin((angle * Math.PI) / 180) + Math.cos((angle * Math.PI) / 180);
        if ((angle / 90) % 2) {
            // 90, 270, ..
            this.data.top +=
                mutiplier * ((x - this.data.imageSize.width / 2) * (oldScale / this.data.scale - 1)) * this.data.scale;
            this.data.left -=
                mutiplier * ((y - this.data.imageSize.height / 2) * (oldScale / this.data.scale - 1)) * this.data.scale;
        } else {
            this.data.left +=
                mutiplier * ((x - this.data.imageSize.width / 2) * (oldScale / this.data.scale - 1)) * this.data.scale;
            this.data.top +=
                mutiplier * ((y - this.data.imageSize.height / 2) * (oldScale / this.data.scale - 1)) * this.data.scale;
        }

        this.notify(UpdateReasons.IMAGE_ZOOMED);
    }

    public move(topOffset: number, leftOffset: number): void {
        this.data.top += topOffset;
        this.data.left += leftOffset;
        this.notify(UpdateReasons.IMAGE_MOVED);
    }

    public fitCanvas(width: number, height: number): void {
        this.data.canvasSize.height = height;
        this.data.canvasSize.width = width;

        this.data.imageOffset = Math.floor(
            Math.max(this.data.canvasSize.height / FrameZoom.MIN, this.data.canvasSize.width / FrameZoom.MIN),
        );

        this.notify(UpdateReasons.FITTED_CANVAS);
        this.notify(UpdateReasons.OBJECTS_UPDATED);
    }

    public bitmap(enabled: boolean): void {
        this.data.imageBitmap = enabled;
        this.notify(UpdateReasons.BITMAP);
    }

    public dragCanvas(enable: boolean): void {
        if (enable && this.data.mode !== Mode.IDLE) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (!enable && this.data.mode !== Mode.DRAG_CANVAS) {
            throw Error(`Canvas is not in the drag mode. Action: ${this.data.mode}`);
        }

        this.data.mode = enable ? Mode.DRAG_CANVAS : Mode.IDLE;
        this.notify(UpdateReasons.DRAG_CANVAS);
    }

    public zoomCanvas(enable: boolean): void {
        if (enable && this.data.mode !== Mode.IDLE) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (!enable && this.data.mode !== Mode.ZOOM_CANVAS) {
            throw Error(`Canvas is not in the zoom mode. Action: ${this.data.mode}`);
        }

        this.data.mode = enable ? Mode.ZOOM_CANVAS : Mode.IDLE;
        this.notify(UpdateReasons.ZOOM_CANVAS);
    }

    public setup(frameData: any, objectStates: any[], zLayer: number): void {
        if (this.data.imageID !== frameData.number) {
            if ([Mode.EDIT, Mode.DRAG, Mode.RESIZE].includes(this.data.mode)) {
                throw Error(`Canvas is busy. Action: ${this.data.mode}`);
            }
        }

        if (frameData.number === this.data.imageID) {
            this.data.zLayer = zLayer;
            this.data.objects = objectStates;
            this.notify(UpdateReasons.OBJECTS_UPDATED);
            return;
        }

        this.data.imageID = frameData.number;
        frameData
            .data((): void => {
                this.data.image = null;
                this.notify(UpdateReasons.IMAGE_CHANGED);
            })
            .then((data: Image): void => {
                if (frameData.number !== this.data.imageID) {
                    // already another image
                    return;
                }

                this.data.imageSize = {
                    height: frameData.height as number,
                    width: frameData.width as number,
                };

                this.data.image = data;
                this.notify(UpdateReasons.IMAGE_CHANGED);
                this.data.zLayer = zLayer;
                this.data.objects = objectStates;
                this.notify(UpdateReasons.OBJECTS_UPDATED);
            })
            .catch((exception: any): void => {
                throw exception;
            });
    }

    public activate(clientID: number | null, attributeID: number | null): void {
        if (this.data.activeElement.clientID === clientID && this.data.activeElement.attributeID === attributeID) {
            return;
        }

        if (this.data.mode !== Mode.IDLE && clientID !== null) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (typeof clientID === 'number') {
            const [state] = this.objects.filter((_state: any): boolean => _state.clientID === clientID);
            if (!state || state.objectType === 'tag') {
                return;
            }
        }

        this.data.activeElement = {
            clientID,
            attributeID,
        };

        this.notify(UpdateReasons.SHAPE_ACTIVATED);
    }

    public rotate(rotationAngle: number): void {
        if (this.data.angle !== rotationAngle) {
            this.data.angle = (360 + Math.floor(rotationAngle / 90) * 90) % 360;
            this.fit();
        }
    }

    public focus(clientID: number, padding: number): void {
        this.data.focusData = {
            clientID,
            padding,
        };

        this.notify(UpdateReasons.SHAPE_FOCUSED);
    }

    public fit(): void {
        const { angle } = this.data;

        if ((angle / 90) % 2) {
            // 90, 270, ..
            this.data.scale = Math.min(
                this.data.canvasSize.width / this.data.imageSize.height,
                this.data.canvasSize.height / this.data.imageSize.width,
            );
        } else {
            this.data.scale = Math.min(
                this.data.canvasSize.width / this.data.imageSize.width,
                this.data.canvasSize.height / this.data.imageSize.height,
            );
        }

        this.data.scale = Math.min(Math.max(this.data.scale, FrameZoom.MIN), FrameZoom.MAX);

        this.data.top = this.data.canvasSize.height / 2 - this.data.imageSize.height / 2;
        this.data.left = this.data.canvasSize.width / 2 - this.data.imageSize.width / 2;

        this.notify(UpdateReasons.IMAGE_FITTED);
    }

    public grid(stepX: number, stepY: number): void {
        this.data.gridSize = {
            height: stepY,
            width: stepX,
        };

        this.notify(UpdateReasons.GRID_UPDATED);
    }

    public draw(drawData: DrawData): void {
        if (![Mode.IDLE, Mode.DRAW].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (drawData.enabled) {
            if (this.data.drawData.enabled) {
                throw new Error('Drawing has been already started');
            } else if (!drawData.shapeType && !drawData.initialState) {
                throw new Error('A shape type is not specified');
            } else if (typeof drawData.numberOfPoints !== 'undefined') {
                if (drawData.shapeType === 'polygon' && drawData.numberOfPoints < 3) {
                    throw new Error('A polygon consists of at least 3 points');
                } else if (drawData.shapeType === 'polyline' && drawData.numberOfPoints < 2) {
                    throw new Error('A polyline consists of at least 2 points');
                }
            }
        }

        if (typeof drawData.redraw === 'number') {
            const clientID = drawData.redraw;
            const [state] = this.data.objects.filter((_state: any): boolean => _state.clientID === clientID);

            if (state) {
                this.data.drawData = { ...drawData };
                this.data.drawData.shapeType = state.shapeType;
            } else {
                return;
            }
        } else {
            this.data.drawData = { ...drawData };
            if (this.data.drawData.initialState) {
                this.data.drawData.shapeType = this.data.drawData.initialState.shapeType;
            }
        }

        this.notify(UpdateReasons.DRAW);
    }

    public interact(interactionData: InteractionData): void {
        if (![Mode.IDLE, Mode.INTERACT].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (interactionData.enabled) {
            if (this.data.interactionData.enabled) {
                throw new Error('Interaction has been already started');
            } else if (!interactionData.shapeType) {
                throw new Error('A shape type was not specified');
            }
        }

        this.data.interactionData = interactionData;
        if (typeof this.data.interactionData.crosshair !== 'boolean') {
            this.data.interactionData.crosshair = true;
        }

        this.notify(UpdateReasons.INTERACT);
    }

    public split(splitData: SplitData): void {
        if (![Mode.IDLE, Mode.SPLIT].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (this.data.splitData.enabled && splitData.enabled) {
            return;
        }

        if (!this.data.splitData.enabled && !splitData.enabled) {
            return;
        }

        this.data.splitData = { ...splitData };
        this.notify(UpdateReasons.SPLIT);
    }

    public group(groupData: GroupData): void {
        if (![Mode.IDLE, Mode.GROUP].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (this.data.groupData.enabled && groupData.enabled) {
            return;
        }

        if (!this.data.groupData.enabled && !groupData.enabled) {
            return;
        }

        this.data.groupData = { ...groupData };
        this.notify(UpdateReasons.GROUP);
    }

    public merge(mergeData: MergeData): void {
        if (![Mode.IDLE, Mode.MERGE].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (this.data.mergeData.enabled && mergeData.enabled) {
            return;
        }

        if (!this.data.mergeData.enabled && !mergeData.enabled) {
            return;
        }

        this.data.mergeData = { ...mergeData };
        this.notify(UpdateReasons.MERGE);
    }

    public select(objectState: any): void {
        this.data.selected = objectState;
        this.notify(UpdateReasons.SELECT);
        this.data.selected = null;
    }

    public configure(configuration: Configuration): void {
        if (typeof configuration.displayAllText !== 'undefined') {
            this.data.configuration.displayAllText = configuration.displayAllText;
        }

        if (typeof configuration.showProjections !== 'undefined') {
            this.data.configuration.showProjections = configuration.showProjections;
        }
        if (typeof configuration.autoborders !== 'undefined') {
            this.data.configuration.autoborders = configuration.autoborders;
        }

        if (typeof configuration.undefinedAttrValue !== 'undefined') {
            this.data.configuration.undefinedAttrValue = configuration.undefinedAttrValue;
        }

        this.notify(UpdateReasons.CONFIG_UPDATED);
    }

    public isAbleToChangeFrame(): boolean {
        const isUnable =
            [Mode.DRAG, Mode.EDIT, Mode.RESIZE, Mode.INTERACT].includes(this.data.mode) ||
            (this.data.mode === Mode.DRAW && typeof this.data.drawData.redraw === 'number');

        return !isUnable;
    }

    public cancel(): void {
        this.notify(UpdateReasons.CANCEL);
    }

    public get configuration(): Configuration {
        return { ...this.data.configuration };
    }

    public get geometry(): Geometry {
        return {
            angle: this.data.angle,
            canvas: { ...this.data.canvasSize },
            image: { ...this.data.imageSize },
            grid: { ...this.data.gridSize },
            left: this.data.left,
            offset: this.data.imageOffset,
            scale: this.data.scale,
            top: this.data.top,
        };
    }

    public set geometry(geometry: Geometry) {
        this.data.angle = geometry.angle;
        this.data.canvasSize = { ...geometry.canvas };
        this.data.imageSize = { ...geometry.image };
        this.data.gridSize = { ...geometry.grid };
        this.data.left = geometry.left;
        this.data.top = geometry.top;
        this.data.imageOffset = geometry.offset;
        this.data.scale = geometry.scale;

        this.data.imageOffset = Math.floor(
            Math.max(this.data.canvasSize.height / FrameZoom.MIN, this.data.canvasSize.width / FrameZoom.MIN),
        );
    }

    public get zLayer(): number | null {
        return this.data.zLayer;
    }

    public get imageBitmap(): boolean {
        return this.data.imageBitmap;
    }

    public get image(): Image | null {
        return this.data.image;
    }

    public get objects(): any[] {
        if (this.data.zLayer !== null) {
            return this.data.objects.filter((object: any): boolean => object.zOrder <= this.data.zLayer);
        }

        return this.data.objects;
    }

    public get gridSize(): Size {
        return { ...this.data.gridSize };
    }

    public get focusData(): FocusData {
        return { ...this.data.focusData };
    }

    public get activeElement(): ActiveElement {
        return { ...this.data.activeElement };
    }

    public get drawData(): DrawData {
        return { ...this.data.drawData };
    }

    public get interactionData(): InteractionData {
        return { ...this.data.interactionData };
    }

    public get mergeData(): MergeData {
        return { ...this.data.mergeData };
    }

    public get splitData(): SplitData {
        return { ...this.data.splitData };
    }

    public get groupData(): GroupData {
        return { ...this.data.groupData };
    }

    public get selected(): any {
        return this.data.selected;
    }

    public set mode(value: Mode) {
        this.data.mode = value;
    }

    public get mode(): Mode {
        return this.data.mode;
    }
}
