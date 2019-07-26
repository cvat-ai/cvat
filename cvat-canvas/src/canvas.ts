/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

interface CanvasInterface {
    html(): HTMLElement;
    setup(frameData: any, objectStates: any[]): void;
    activate(clientID: number, attributeID?: number): void;
    rotate(direction: Rotation): void;
    focus(clientID: number, padding?: number): void;
    fit(): void;
    grid(stepX: number, stepY: number, color?: GridColor, opacity?: number): void;

    draw(shapeType: string, numberOfPoints: number, initialState: any): any;
    split(enabled?: boolean): any;
    group(enabled?: boolean): any;
    merge(enabled?: boolean): any;

    cancel(): void;
}

export enum GridColor {
    BLACK,
    RED,
    GREEN,
    BLUE,
    WHITE,
};

export enum Rotation {
    CLOCKWISE,
    ANTICLOCKWISE,
};


export class Canvas implements CanvasInterface {
    constructor() {

    }

    html(): HTMLElement {
        throw new Error("Method not implemented.");
    }

    setup(frameData: any, objectStates: any[]): void {
        throw new Error("Method not implemented.");
    }

    activate(clientID: number, attributeID: number = null): void {
        throw new Error("Method not implemented.");
    }

    rotate(direction: Rotation): void {
        throw new Error("Method not implemented.");
    }

    focus(clientID: number, padding: number = 0): void {
        throw new Error("Method not implemented.");
    }

    fit(): void {
        throw new Error("Method not implemented.");
    }

    grid(stepX: number, stepY: number, color: GridColor = GridColor.WHITE, opacity: number = 1): void {
        throw new Error("Method not implemented.");
    }

    draw(shapeType: string, numberOfPoints: number, initialState: any) {
        throw new Error("Method not implemented.");
    }

    split(enabled: boolean = false) {
        throw new Error("Method not implemented.");
    }

    group(enabled: boolean = false) {
        throw new Error("Method not implemented.");
    }

    merge(enabled: boolean = false) {
        throw new Error("Method not implemented.");
    }

    cancel(): void {
        throw new Error("Method not implemented.");
    }
}
