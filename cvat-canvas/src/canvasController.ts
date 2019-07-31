/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import CanvasModelImpl from './canvasModel';

interface CanvasController {
    a: string;
}

export default class CanvasControllerImpl implements CanvasController {
    private model: CanvasModelImpl;
    public a: string = 'string';

    public constructor(model: CanvasModelImpl) {
        this.model = model;
    }
}
