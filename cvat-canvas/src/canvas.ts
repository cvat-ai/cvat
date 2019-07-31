/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import CanvasModelImpl from './canvasModel';
import CanvasControllerImpl from './canvasController';
import CanvasViewImpl from './canvasView';

interface Canvas {
    html(): HTMLDivElement;
    setup(frameData: any, objectStates: any[]): void;
    activate(clientID: number, attributeID?: number): void;
    rotate(direction: Rotation): void;
    focus(clientID: number, padding?: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    draw(enabled?: boolean, shapeType?: string, numberOfPoints?: number, initialState?: any): any;
    split(enabled?: boolean): any;
    group(enabled?: boolean): any;
    merge(enabled?: boolean): any;

    cancel(): void;
}

export enum Rotation {
    CLOCKWISE90,
    ANTICLOCKWISE90,
}

class CanvasImpl implements Canvas {
    private model: CanvasModelImpl;
    private controller: CanvasControllerImpl;
    private view: CanvasViewImpl;

    public constructor() {
        this.model = new CanvasModelImpl();
        this.controller = new CanvasControllerImpl(this.model);
        this.view = new CanvasViewImpl(this.model, this.controller);
    }

    public html(): HTMLDivElement {
        return this.view.html();
    }

    public setup(frameData: any, objectStates: any[]): void {
        return this.model.setup(frameData, objectStates);
    }

    public activate(clientID: number, attributeID: number = null): void {
        return this.model.activate(clientID, attributeID);
    }

    public rotate(direction: Rotation): void {
        return this.model.rotate(direction);
    }

    public focus(clientID: number, padding: number = 0): void {
        return this.model.focus(clientID, padding);
    }

    public fit(): void {
        return this.model.fit();
    }

    public grid(stepX: number, stepY: number): void {
        return this.model.grid(stepX, stepY);
    }

    public draw(enabled: boolean = false, shapeType: string = '', numberOfPoints: number = 0, initialState: any = null): any {
        return this.model.draw(enabled, shapeType, numberOfPoints, initialState);
    }

    public split(enabled: boolean = false): any {
        return this.model.split(enabled);
    }

    public group(enabled: boolean = false): any {
        return this.model.group(enabled);
    }

    public merge(enabled: boolean = false): any {
        return this.model.merge(enabled);
    }

    public cancel(): void {
        return this.model.cancel();
    }
}

export { CanvasImpl as Canvas };
