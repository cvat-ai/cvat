/*
* Copyright (C) 2019 Intel Corporation
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
    angle: number;
}

export enum FrameZoom {
    MIN = 0.1,
    MAX = 10,
}

export enum Rotation {
    ANTICLOCKWISE90,
    CLOCKWISE90,
}

export enum UpdateReasons {
    IMAGE = 'image',
    OBJECTS = 'objects',
    ZOOM = 'zoom',
    FIT = 'fit',
    MOVE = 'move',
}

export interface CanvasModel extends MasterImpl {
    readonly image: string;
    readonly objects: any[];
    geometry: Geometry;
    imageSize: Size;
    canvasSize: Size;

    zoom(x: number, y: number, direction: number): void;
    move(topOffset: number, leftOffset: number): void;

    setup(frameData: any, objectStates: any[]): void;
    activate(clientID: number, attributeID: number): void;
    rotate(rotation: Rotation, remember: boolean): void;
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
        objects: any[];
        imageSize: Size;
        canvasSize: Size;
        imageOffset: number;
        scale: number;
        top: number;
        left: number;
        angle: number;
        rememberAngle: boolean;
    };

    public constructor() {
        super();

        this.data = {
            angle: 0,
            canvasSize: {
                height: 0,
                width: 0,
            },
            image: '',
            imageOffset: 0,
            imageSize: {
                height: 0,
                width: 0,
            },
            left: 0,
            objects: [],
            rememberAngle: false,
            scale: 1,
            top: 0,
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
                height: (frameData.height as number),
                width: (frameData.width as number),
            };

            if (!this.data.rememberAngle) {
                this.data.angle = 0;
            }

            this.data.image = data;
            this.notify(UpdateReasons.IMAGE);
            this.data.objects = objectStates;
            this.notify(UpdateReasons.OBJECTS);
        }).catch((exception: any): void => {
            console.log(exception.toString());
        });

        console.log(objectStates);
    }

    public activate(clientID: number, attributeID: number): void {
        console.log(clientID, attributeID);
    }

    public rotate(rotation: Rotation, remember: boolean = false): void {
        if (rotation === Rotation.CLOCKWISE90) {
            this.data.angle += 90;
        } else {
            this.data.angle -= 90;
        }

        this.data.angle %= 360;
        this.data.rememberAngle = remember;
        this.fit();
    }

    public focus(clientID: number, padding: number): void {
        console.log(clientID, padding);
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
            initialState,
            numberOfPoints,
            shapeType,
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
        console.log('hello');
    }

    public get geometry(): Geometry {
        return {
            angle: this.data.angle,
            canvas: {
                height: this.data.canvasSize.height,
                width: this.data.canvasSize.width,
            },
            image: {
                height: this.data.imageSize.height,
                width: this.data.imageSize.width,
            },
            left: this.data.left,
            offset: this.data.imageOffset,
            scale: this.data.scale,
            top: this.data.top,
        };
    }

    public get image(): string {
        return this.data.image;
    }

    public get objects(): any[] {
        return this.data.objects;
    }

    public set imageSize(value: Size) {
        this.data.imageSize = {
            height: value.height,
            width: value.width,
        };
    }

    public get imageSize(): Size {
        return {
            height: this.data.imageSize.height,
            width: this.data.imageSize.width,
        };
    }

    public set canvasSize(value: Size) {
        this.data.canvasSize = {
            height: value.height,
            width: value.width,
        };

        this.data.imageOffset = Math.floor(Math.max(
            this.data.canvasSize.height / FrameZoom.MIN,
            this.data.canvasSize.width / FrameZoom.MIN,
        ));
    }

    public get canvasSize(): Size {
        return {
            height: this.data.canvasSize.height,
            width: this.data.canvasSize.width,
        };
    }
}
