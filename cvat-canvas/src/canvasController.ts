/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { CanvasModel, Geometry } from './canvasModel';


export interface CanvasController {
    readonly geometry: Geometry;
}

export class CanvasControllerImpl implements CanvasController {
    private model: CanvasModel;

    public constructor(model: CanvasModel) {
        this.model = model;
    }

    public get geometry(): Geometry {
        return this.model.geometry;
    }
}
