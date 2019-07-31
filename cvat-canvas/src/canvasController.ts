/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/


interface CanvasController {
    a: string;
}

export default class CanvasControllerImpl implements CanvasController {
    public a: string = 'string';

    public constructor() {
        return this;
    }
}
