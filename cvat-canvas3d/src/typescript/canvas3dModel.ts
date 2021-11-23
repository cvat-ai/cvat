// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { MasterImpl } from './master';

export interface Size {
    width: number;
    height: number;
}

export interface ActiveElement {
    clientID: string | null;
    attributeID: number | null;
}

export interface GroupData {
    enabled: boolean;
    grouped?: [];
}

export interface Image {
    renderWidth: number;
    renderHeight: number;
    imageData: ImageData | CanvasImageSource;
}

export interface DrawData {
    enabled: boolean;
    initialState?: any;
    redraw?: number;
    shapeType?: string;
}

export enum FrameZoom {
    MIN = 0.1,
    MAX = 10,
}

export enum Planes {
    TOP = 'topPlane',
    SIDE = 'sidePlane',
    FRONT = 'frontPlane',
    PERSPECTIVE = 'perspectivePlane',
}

export enum ViewType {
    PERSPECTIVE = 'perspective',
    TOP = 'top',
    SIDE = 'side',
    FRONT = 'front',
}

export enum MouseInteraction {
    CLICK = 'click',
    DOUBLE_CLICK = 'dblclick',
    HOVER = 'hover',
}

export interface FocusData {
    clientID: string | null;
}

export interface ShapeProperties {
    opacity: number;
    outlined: boolean;
    outlineColor: string;
    selectedOpacity: number;
    colorBy: string;
}

export enum UpdateReasons {
    IMAGE_CHANGED = 'image_changed',
    OBJECTS_UPDATED = 'objects_updated',
    DRAW = 'draw',
    SELECT = 'select',
    CANCEL = 'cancel',
    DATA_FAILED = 'data_failed',
    DRAG_CANVAS = 'drag_canvas',
    SHAPE_ACTIVATED = 'shape_activated',
    GROUP = 'group',
    FITTED_CANVAS = 'fitted_canvas',
}

export enum Mode {
    IDLE = 'idle',
    DRAG = 'drag',
    RESIZE = 'resize',
    DRAW = 'draw',
    EDIT = 'edit',
    INTERACT = 'interact',
    DRAG_CANVAS = 'drag_canvas',
    GROUP = 'group',
    BUSY = 'busy',
}

export interface Canvas3dDataModel {
    activeElement: ActiveElement;
    canvasSize: Size;
    image: Image | null;
    imageID: number | null;
    imageOffset: number;
    imageSize: Size;
    drawData: DrawData;
    mode: Mode;
    objectUpdating: boolean;
    exception: Error | null;
    objects: any[];
    groupedObjects: any[];
    focusData: FocusData;
    selected: any;
    shapeProperties: ShapeProperties;
    groupData: GroupData;
}

export interface Canvas3dModel {
    mode: Mode;
    data: Canvas3dDataModel;
    readonly groupData: GroupData;
    setup(frameData: any, objectStates: any[]): void;
    isAbleToChangeFrame(): boolean;
    draw(drawData: DrawData): void;
    cancel(): void;
    dragCanvas(enable: boolean): void;
    activate(clientID: string | null, attributeID: number | null): void;
    configureShapes(shapeProperties: any): void;
    fit(): void;
    group(groupData: GroupData): void;
    destroy(): void;
}

export class Canvas3dModelImpl extends MasterImpl implements Canvas3dModel {
    public data: Canvas3dDataModel;

    public constructor() {
        super();
        this.data = {
            activeElement: {
                clientID: null,
                attributeID: null,
            },
            canvasSize: {
                height: 0,
                width: 0,
            },
            objectUpdating: false,
            objects: [],
            groupedObjects: [],
            image: null,
            imageID: null,
            imageOffset: 0,
            imageSize: {
                height: 0,
                width: 0,
            },
            drawData: {
                enabled: false,
                initialState: null,
            },
            mode: Mode.IDLE,
            exception: null,
            focusData: {
                clientID: null,
            },
            groupData: {
                enabled: false,
                grouped: [],
            },
            selected: null,
            shapeProperties: {
                opacity: 40,
                outlined: false,
                outlineColor: '#000000',
                selectedOpacity: 60,
                colorBy: 'Label',
            },
        };
    }

    public setup(frameData: any, objectStates: any[]): void {
        if (this.data.imageID !== frameData.number) {
            if ([Mode.EDIT, Mode.DRAG, Mode.RESIZE].includes(this.data.mode)) {
                throw Error(`Canvas is busy. Action: ${this.data.mode}`);
            }
        }
        if ([Mode.EDIT, Mode.BUSY].includes(this.data.mode)) {
            return;
        }

        if (frameData.number === this.data.imageID) {
            if (this.data.objectUpdating) {
                return;
            }
            this.data.objects = objectStates;
            this.data.objectUpdating = true;
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
                this.data.objects = objectStates;
                this.notify(UpdateReasons.OBJECTS_UPDATED);
            })
            .catch((exception: any): void => {
                this.data.exception = exception;
                this.notify(UpdateReasons.DATA_FAILED);
                throw exception;
            });
    }

    public set mode(value: Mode) {
        this.data.mode = value;
    }

    public get mode(): Mode {
        return this.data.mode;
    }

    public isAbleToChangeFrame(): boolean {
        const isUnable = [Mode.DRAG, Mode.EDIT, Mode.RESIZE, Mode.INTERACT, Mode.BUSY].includes(this.data.mode) ||
            (this.data.mode === Mode.DRAW && typeof this.data.drawData.redraw === 'number');
        return !isUnable;
    }

    public draw(drawData: DrawData): void {
        if (drawData.enabled && this.data.drawData.enabled && !drawData.initialState) {
            throw new Error('Drawing has been already started');
        }
        if ([Mode.DRAW, Mode.EDIT].includes(this.data.mode) && !drawData.initialState) {
            return;
        }
        this.data.drawData.enabled = drawData.enabled;
        this.data.mode = Mode.DRAW;

        if (typeof drawData.redraw === 'number') {
            const clientID = drawData.redraw;
            const [state] = this.data.objects.filter((_state: any): boolean => _state.clientID === clientID);

            if (state) {
                this.data.drawData = { ...drawData };
                this.data.drawData.initialState = { ...this.data.drawData.initialState, label: state.label };
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

    public cancel(): void {
        this.notify(UpdateReasons.CANCEL);
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

    public activate(clientID: string, attributeID: number | null): void {
        if (this.data.activeElement.clientID === clientID && this.data.activeElement.attributeID === attributeID) {
            return;
        }
        if (this.data.mode !== Mode.IDLE) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }
        if (typeof clientID === 'number') {
            const [state] = this.data.objects.filter((_state: any): boolean => _state.clientID === clientID);
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
        this.data.mode = groupData.enabled ? Mode.GROUP : Mode.IDLE;
        this.data.groupData = { ...this.data.groupData, ...groupData };
        this.notify(UpdateReasons.GROUP);
    }

    public configureShapes(shapeProperties: ShapeProperties): void {
        this.data.drawData.enabled = false;
        this.data.mode = Mode.IDLE;
        this.cancel();
        this.data.shapeProperties = {
            ...shapeProperties,
        };
        this.notify(UpdateReasons.OBJECTS_UPDATED);
    }

    public fit(): void {
        this.notify(UpdateReasons.FITTED_CANVAS);
    }

    public get groupData(): GroupData {
        return { ...this.data.groupData };
    }

    public destroy(): void {}
}
