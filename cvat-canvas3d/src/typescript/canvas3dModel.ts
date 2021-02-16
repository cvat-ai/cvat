// Copyright (C) 2021 Intel Corporation
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

export interface DrawData {
    enabled: boolean;
    initialState?: any;
    redraw?: number;
}

export enum FrameZoom {
    MIN = 0.1,
    MAX = 10,
}

export enum UpdateReasons {
    IMAGE_CHANGED = 'image_changed',
    OBJECTS_UPDATED = 'objects_updated',
    FITTED_CANVAS = 'fitted_canvas',
    DRAW = 'draw',
    SELECT = 'select',
    CANCEL = 'cancel',
    DATA_FAILED = 'data_failed',
}

export enum Mode {
    IDLE = 'idle',
    DRAG = 'drag',
    RESIZE = 'resize',
    DRAW = 'draw',
    EDIT = 'edit',
    INTERACT = 'interact',
}

export interface Canvas3dDataModel {
    canvasSize: Size;
    image: Image | null;
    imageID: number | null;
    imageOffset: number;
    imageSize: Size;
    drawData: DrawData;
    mode: Mode;
    exception: Error | null;
}

export interface Canvas3dModel {
    mode: Mode;
    data: Canvas3dDataModel;
    setup(frameData: any): void;
    isAbleToChangeFrame(): boolean;
}

export class Canvas3dModelImpl extends MasterImpl implements Canvas3dModel {
    public data: Canvas3dDataModel;

    public constructor() {
        super();
        this.data = {
            canvasSize: {
                height: 0,
                width: 0,
            },
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
        };
    }

    public setup(frameData: any): void {
        if (this.data.imageID !== frameData.number) {
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
                })
                .catch((exception: any): void => {
                    this.data.exception = exception;
                    this.notify(UpdateReasons.DATA_FAILED);
                    throw exception;
                });
        }
    }

    public set mode(value: Mode) {
        this.data.mode = value;
    }

    public get mode(): Mode {
        return this.data.mode;
    }

    public isAbleToChangeFrame(): boolean {
        const isUnable = [Mode.DRAG, Mode.EDIT, Mode.RESIZE, Mode.INTERACT].includes(this.data.mode)
            || (this.data.mode === Mode.DRAW && typeof this.data.drawData.redraw === 'number');

        return !isUnable;
    }
}
