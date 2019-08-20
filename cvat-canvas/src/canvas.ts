/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import {
    CanvasModel,
    CanvasModelImpl,
    Rotation,
    DrawData,
} from './canvasModel';

import {
    CanvasController,
    CanvasControllerImpl,
} from './canvasController';

import {
    CanvasView,
    CanvasViewImpl,
} from './canvasView';

interface Canvas {
    html(): HTMLDivElement;
    setup(frameData: any, objectStates: any[]): void;
    activate(clientID: number, attributeID?: number): void;
    rotate(rotation: Rotation, remember?: boolean): void;
    focus(clientID: number, padding?: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    draw(drawData: DrawData): void;
    split(enabled?: boolean): void;
    group(enabled?: boolean): void;
    merge(enabled?: boolean): void;

    cancel(): void;
}

class CanvasImpl implements Canvas {
    private model: CanvasModel;
    private controller: CanvasController;
    private view: CanvasView;

    public constructor(ObjectStateClass: any) {
        this.model = new CanvasModelImpl(ObjectStateClass);
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

    public rotate(rotation: Rotation, remember: boolean): void {
        this.model.rotate(rotation, remember);
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

    public draw(drawData: DrawData): void {
        this.model.draw(drawData);
    }

    public split(enabled: boolean = false): void {
        this.model.split(enabled);
    }

    public group(enabled: boolean = false): void {
        this.model.group(enabled);
    }

    public merge(enabled: boolean = false): void {
        this.model.merge(enabled);
    }

    public cancel(): void {
        this.model.cancel();
    }
}

export {
    CanvasImpl as Canvas,
    Rotation,
};
