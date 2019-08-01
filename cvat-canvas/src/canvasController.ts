/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { CanvasModel, Geometry, Size } from './canvasModel';


export interface CanvasController {
    readonly geometry: Geometry;
    canvasSize: Size;

    zoom(x: number, y: number, direction: number): void;
    fit(): void;
}

export class CanvasControllerImpl implements CanvasController {
    private model: CanvasModel;

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
}
