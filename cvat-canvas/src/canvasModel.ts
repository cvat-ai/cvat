/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { MasterImpl } from './master';

export interface Size {
    width: number;
    height: number;
}

export interface Geometry {
    image: Size;
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
}

export interface CanvasModel extends MasterImpl {
    image: string;
    geometry: Geometry;
    imageSize: Size;

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
            imageOffset: 0,
            scale: 1,
            top: 0,
            left: 0,
        };
    }

    public setup(frameData: any, objectStates: any[]): void {
        frameData.data(
            (): void => {
                this.data.image = '';
                this.notify(UpdateReasons.IMAGE);
            },
        ).then((data: string): void => {
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
        console.log('Fit()');
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

        this.data.imageOffset = Math.floor(Math.max(
            this.data.imageSize.height / FrameZoom.MIN,
            this.data.imageSize.width / FrameZoom.MIN,
        ));
    }

    public get imageSize(): Size {
        return {
            width: this.data.imageSize.width,
            height: this.data.imageSize.height,
        };
    }
}

// TODO List:
// 2) Resize image
// 3) Move image
// 4) Fit image
// 5) Add grid
// 6) Draw objects
