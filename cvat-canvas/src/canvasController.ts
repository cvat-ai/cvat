/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import {
    CanvasModel,
    Geometry,
    Size,
    Position,
} from './canvasModel';


export interface CanvasController {
    readonly geometry: Geometry;
    canvasSize: Size;

    zoom(x: number, y: number, direction: number): void;
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

    public get geometry(): Geometry {
        return this.model.geometry;
    }

    public zoom(x: number, y: number, direction: number): void {
        this.model.zoom(x, y, direction);
    }

    public fit(): void {
        this.model.fit();
    }

    public set canvasSize(value: Size) {
        this.model.canvasSize = value;
    }

    public get canvasSize(): Size {
        return this.model.canvasSize;
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
}
