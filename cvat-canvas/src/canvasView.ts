/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/


interface CanvasView {
    c: string;
}

export default class CanvasViewImpl implements CanvasView {
    public c: string = 'string';

    public constructor() {
        return this;
    }
}
