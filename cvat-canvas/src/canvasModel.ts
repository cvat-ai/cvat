/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { MasterImpl } from './master';

export enum Rotation {
    CLOCKWISE90,
    ANTICLOCKWISE90,
}

export enum UpdateReasons {
    IMAGE = 'image',
}

export interface CanvasModel extends MasterImpl {
    image: string;

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
    public image: string;

    public constructor() {
        super();
    }

    public setup(frameData: any, objectStates: any[]): void {
        frameData.data(
            (): void => {
                this.image = '';
                this.notify(UpdateReasons.IMAGE);
            },
        ).then((data: string): void => {
            this.image = data;
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
}

// TODO List:
// 2) Resize image
// 3) Move image
// 4) Fit image
// 5) Add grid
