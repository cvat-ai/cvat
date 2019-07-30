/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* eslint-disable */
// Temporary disable eslint

interface CanvasInterface {
    html(): HTMLElement;
    setup(frameData: any, objectStates: any[]): void;
    activate(clientID: number, attributeID?: number): void;
    rotate(direction: Rotation): void;
    focus(clientID: number, padding?: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    draw(shapeType: string, numberOfPoints: number, initialState: any): any;
    split(enabled?: boolean): any;
    group(enabled?: boolean): any;
    merge(enabled?: boolean): any;

    cancel(): void;
}

export enum Rotation {
    CLOCKWISE90,
    ANTICLOCKWISE90,
}

export class Canvas implements CanvasInterface {
    public constructor() {
        return this;
    }

    public html(): HTMLElement {
        throw new Error('Method not implemented.');
    }

    public setup(frameData: any, objectStates: any[]): void {
        throw new Error('Method not implemented.');
    }

    public activate(clientID: number, attributeID: number = null): void {
        throw new Error('Method not implemented.');
    }

    public rotate(direction: Rotation): void {
        throw new Error('Method not implemented.');
    }

    public focus(clientID: number, padding: number = 0): void {
        throw new Error('Method not implemented.');
    }

    public fit(): void {
        throw new Error('Method not implemented.');
    }

    public grid(stepX: number, stepY: number): void {
        throw new Error('Method not implemented.');
    }

    public draw(shapeType: string, numberOfPoints: number, initialState: any): any {
        throw new Error('Method not implemented.');
    }

    public split(enabled: boolean = false): any {
        throw new Error('Method not implemented.');
    }

    public group(enabled: boolean = false): any {
        throw new Error('Method not implemented.');
    }

    public merge(enabled: boolean = false): any {
        throw new Error('Method not implemented.');
    }

    public cancel(): void {
        throw new Error('Method not implemented.');
    }
}
