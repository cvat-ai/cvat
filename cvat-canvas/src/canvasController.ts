/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { CanvasModel } from './canvasModel';

export interface CanvasController {
    a: string;
}

export class CanvasControllerImpl implements CanvasController {
    private model: CanvasModel;

    public constructor(model: CanvasModel) {
        this.model = model;
    }

    public get a(): string {
        return 'string';
    }
}
