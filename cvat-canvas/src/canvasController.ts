/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import {
    CanvasModel,
    Geometry,
    Position,
    FocusData,
    ActiveElement,
    DrawData,
} from './canvasModel';

export interface CanvasController {
    readonly objects: any[];
    readonly focusData: FocusData;
    readonly activeElement: ActiveElement;
    readonly objectStateClass: any;
    readonly drawData: DrawData;
    geometry: Geometry;

    zoom(x: number, y: number, direction: number): void;
    draw(drawData: DrawData): void;
    enableDrag(x: number, y: number): void;
    drag(x: number, y: number): void;
    disableDrag(): void;

    fit(): void;
}

export class CanvasControllerImpl implements CanvasController {
    private model: CanvasModel;
    private lastDragPosition: Position;
    private isDragging: boolean;

    public constructor(model: CanvasModel) {
        this.model = model;
    }

    public zoom(x: number, y: number, direction: number): void {
        this.model.zoom(x, y, direction);
    }

    public fit(): void {
        this.model.fit();
    }

    public enableDrag(x: number, y: number): void {
        this.lastDragPosition = {
            x,
            y,
        };
        this.isDragging = true;
    }

    public drag(x: number, y: number): void {
        if (this.isDragging) {
            const topOffset: number = y - this.lastDragPosition.y;
            const leftOffset: number = x - this.lastDragPosition.x;
            this.lastDragPosition = {
                x,
                y,
            };
            this.model.move(topOffset, leftOffset);
        }
    }

    public disableDrag(): void {
        this.isDragging = false;
    }

    public draw(drawData: DrawData): void {
        this.model.draw(drawData);
    }

    public get geometry(): Geometry {
        return this.model.geometry;
    }

    public set geometry(geometry: Geometry) {
        this.model.geometry = geometry;
    }

    public get objects(): any[] {
        return this.model.objects;
    }

    public get focusData(): FocusData {
        return this.model.focusData;
    }

    public get activeElement(): ActiveElement {
        return this.model.activeElement;
    }

    public get objectStateClass(): any {
        return this.model.objectStateClass;
    }

    public get drawData(): DrawData {
        return this.model.drawData;
    }
}
