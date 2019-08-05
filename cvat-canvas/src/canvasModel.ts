/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { MasterImpl } from './master';

export interface Size {
    width: number;
    height: number;
}

export interface Position {
    x: number;
    y: number;
}

export interface Geometry {
    image: Size;
    canvas: Size;
    top: number;
    left: number;
    scale: number;
    offset: number;
}

export enum FrameZoom {
    MIN = 0.1,
    MAX = 10,
}

export enum Rotation {
    CLOCKWISE90,
    ANTICLOCKWISE90,
}

export enum UpdateReasons {
    IMAGE = 'image',
    ZOOM = 'zoom',
    FIT = 'fit',
    MOVE = 'move',
}

export interface CanvasModel extends MasterImpl {
    image: string;
    geometry: Geometry;
    imageSize: Size;
    canvasSize: Size;

    zoom(x: number, y: number, direction: number): void;
    move(topOffset: number, leftOffset: number): void;

    setup(frameData: any, objectStates: any[]): void;
    activate(clientID: number, attributeID: number): void;
    rotate(direction: Rotation): void;
    focus(clientID: number, padding: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    draw(enabled: boolean, shapeType: string, numberOfPoints: number, initialState: any): any;
    split(enabled: boolean): any;
    group(enabled: boolean): any;
    merge(enabled: boolean): any;

    cancel(): void;
}

export class CanvasModelImpl extends MasterImpl implements CanvasModel {
    private data: {
        image: string;
        imageSize: Size;
        canvasSize: Size;
        imageOffset: number;
        scale: number;
        top: number;
        left: number;
    };

    public constructor() {
        super();

        this.data = {
            image: '',
            imageSize: {
                width: 0,
                height: 0,
            },
            canvasSize: {
                width: 0,
                height: 0,
            },
            imageOffset: 0,
            scale: 1,
            top: 0,
            left: 0,
        };
    }

    public zoom(x: number, y: number, direction: number): void {
        const oldScale: number = this.data.scale;
        const newScale: number = direction > 0 ? oldScale * 6 / 5 : oldScale * 5 / 6;
        this.data.scale = Math.min(Math.max(newScale, FrameZoom.MIN), FrameZoom.MAX);
        this.data.left += (x * (oldScale / this.data.scale - 1)) * this.data.scale;
        this.data.top += (y * (oldScale / this.data.scale - 1)) * this.data.scale;

        this.notify(UpdateReasons.ZOOM);
    }

    public move(topOffset: number, leftOffset: number): void {
        this.data.top += topOffset;
        this.data.left += leftOffset;
        this.notify(UpdateReasons.MOVE);
    }


    public setup(frameData: any, objectStates: any[]): void {
        frameData.data(
            (): void => {
                this.data.image = '';
                this.notify(UpdateReasons.IMAGE);
            },
        ).then((data: string): void => {
            this.data.imageSize = {
                width: (frameData.width as number),
                height: (frameData.height as number),
            };

            this.data.image = data;
            this.notify(UpdateReasons.IMAGE);
        }).catch((exception: any): void => {
            console.log(exception.toString());
        });

        console.log(objectStates);
    }

    public activate(clientID: number, attributeID: number): void {
        console.log(clientID, attributeID);
    }

    public rotate(direction: Rotation): void {
        console.log(direction);
    }

    public focus(clientID: number, padding: number): void {
        console.log(clientID, padding);
    }

    public fit(): void {
        this.data.scale = Math.min(
            this.data.canvasSize.width / this.data.imageSize.width,
            this.data.canvasSize.height / this.data.imageSize.height,
        );

        this.data.scale = Math.min(
            Math.max(this.data.scale, FrameZoom.MIN),
            FrameZoom.MAX,
        );

        this.data.top = (this.data.canvasSize.height
            - this.data.imageSize.height * this.data.scale) / 2;
        this.data.left = (this.data.canvasSize.width
            - this.data.imageSize.width * this.data.scale) / 2;

        this.notify(UpdateReasons.FIT);
    }

    public grid(stepX: number, stepY: number): void {
        console.log(stepX, stepY);
    }

    public draw(enabled: boolean, shapeType: string,
        numberOfPoints: number, initialState: any): any {
        return {
            enabled,
            shapeType,
            numberOfPoints,
            initialState,
        };
    }

    public split(enabled: boolean): any {
        return enabled;
    }

    public group(enabled: boolean): any {
        return enabled;
    }

    public merge(enabled: boolean): any {
        return enabled;
    }

    public cancel(): void {

    }

    public get geometry(): Geometry {
        return {
            image: {
                width: this.data.imageSize.width,
                height: this.data.imageSize.height,
            },
            canvas: {
                width: this.data.canvasSize.width,
                height: this.data.canvasSize.height,
            },
            top: this.data.top,
            left: this.data.left,
            scale: this.data.scale,
            offset: this.data.imageOffset,
        };
    }

    public get image(): string {
        return this.data.image;
    }

    public set imageSize(value: Size) {
        this.data.imageSize = {
            width: value.width,
            height: value.height,
        };
    }

    public get imageSize(): Size {
        return {
            width: this.data.imageSize.width,
            height: this.data.imageSize.height,
        };
    }

    public set canvasSize(value: Size) {
        this.data.canvasSize = {
            width: value.width,
            height: value.height,
        };

        this.data.imageOffset = Math.floor(Math.max(
            this.data.canvasSize.height / FrameZoom.MIN,
            this.data.canvasSize.width / FrameZoom.MIN,
        ));
    }

    public get canvasSize(): Size {
        return {
            width: this.data.canvasSize.width,
            height: this.data.canvasSize.height,
        };
    }
}

// TODO List:
// 2) Rotate image
// 3) Draw objects
