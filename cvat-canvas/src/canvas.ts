/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { CanvasController, CanvasControllerImpl } from './canvasController';
import { CanvasModel, CanvasModelImpl, Rotation } from './canvasModel';
import { CanvasView, CanvasViewImpl } from './canvasView';

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

class CanvasImpl implements Canvas {
    private model: CanvasModel;
    private controller: CanvasController;
    private view: CanvasView;

    public constructor() {
        this.model = new CanvasModelImpl();
        this.controller = new CanvasControllerImpl(this.model);
        this.view = new CanvasViewImpl(this.model, this.controller);
    }

    public html(): HTMLDivElement {
        return this.view.html();
    }

    public setup(frameData: any, objectStates: any[]): void {
        this.model.setup(frameData, objectStates);
    }

    public activate(clientID: number, attributeID: number = null): void {
        this.model.activate(clientID, attributeID);
    }

    public rotate(direction: Rotation): void {
        this.model.rotate(direction);
    }

    public focus(clientID: number, padding: number = 0): void {
        this.model.focus(clientID, padding);
    }

    public fit(): void {
        this.model.fit();
    }

    public grid(stepX: number, stepY: number): void {
        this.model.grid(stepX, stepY);
    }

    public draw(enabled: boolean = false, shapeType: string = '',
                numberOfPoints: number = 0, initialState: any = null): any {
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
        this.model.cancel();
    }
}

export {
    CanvasImpl as Canvas,
    Rotation,
};
