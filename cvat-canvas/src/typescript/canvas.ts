// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    Mode,
    DrawData,
    MergeData,
    SplitData,
    GroupData,
    InteractionData,
    InteractionResult,
    CanvasModel,
    CanvasModelImpl,
    RectDrawingMethod,
    CuboidDrawingMethod,
    Configuration,
} from './canvasModel';
import { Master } from './master';
import { CanvasController, CanvasControllerImpl } from './canvasController';
import { CanvasView, CanvasViewImpl } from './canvasView';

import '../scss/canvas.scss';
import pjson from '../../package.json';

const CanvasVersion = pjson.version;

interface Canvas {
    html(): HTMLDivElement;
    setup(frameData: any, objectStates: any[], zLayer?: number): void;
    activate(clientID: number | null, attributeID?: number): void;
    rotate(rotationAngle: number): void;
    focus(clientID: number, padding?: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    interact(interactionData: InteractionData): void;
    draw(drawData: DrawData): void;
    group(groupData: GroupData): void;
    split(splitData: SplitData): void;
    merge(mergeData: MergeData): void;
    select(objectState: any): void;

    fitCanvas(): void;
    bitmap(enable: boolean): void;
    dragCanvas(enable: boolean): void;
    zoomCanvas(enable: boolean): void;

    mode(): Mode;
    cancel(): void;
    configure(configuration: Configuration): void;
    isAbleToChangeFrame(): boolean;
}

class CanvasImpl implements Canvas {
    private model: CanvasModel & Master;
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

    public setup(frameData: any, objectStates: any[], zLayer = 0): void {
        this.model.setup(frameData, objectStates, zLayer);
    }

    public fitCanvas(): void {
        this.model.fitCanvas(this.view.html().clientWidth, this.view.html().clientHeight);
    }

    public bitmap(enable: boolean): void {
        this.model.bitmap(enable);
    }

    public dragCanvas(enable: boolean): void {
        this.model.dragCanvas(enable);
    }

    public zoomCanvas(enable: boolean): void {
        this.model.zoomCanvas(enable);
    }

    public activate(clientID: number | null, attributeID: number | null = null): void {
        this.model.activate(clientID, attributeID);
    }

    public rotate(rotationAngle: number): void {
        this.model.rotate(rotationAngle);
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

    public interact(interactionData: InteractionData): void {
        this.model.interact(interactionData);
    }

    public draw(drawData: DrawData): void {
        this.model.draw(drawData);
    }

    public split(splitData: SplitData): void {
        this.model.split(splitData);
    }

    public group(groupData: GroupData): void {
        this.model.group(groupData);
    }

    public merge(mergeData: MergeData): void {
        this.model.merge(mergeData);
    }

    public select(objectState: any): void {
        this.model.select(objectState);
    }

    public mode(): Mode {
        return this.model.mode;
    }

    public cancel(): void {
        this.model.cancel();
    }

    public configure(configuration: Configuration): void {
        this.model.configure(configuration);
    }

    public isAbleToChangeFrame(): boolean {
        return this.model.isAbleToChangeFrame();
    }
}

export {
    CanvasImpl as Canvas,
    CanvasVersion,
    Configuration,
    RectDrawingMethod,
    CuboidDrawingMethod,
    Mode as CanvasMode,
    InteractionData,
    InteractionResult,
};
