/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import MasterImpl from './master';

interface CanvasModel {
    setup(frameData: any, objectStates: any[]): void;
}

export default class CanvasModelImpl extends MasterImpl implements CanvasModel {
    public constructor() {
        super();

        return this;
    }

    public setup(frameData: any, objectStates: any[]): void {
        // load frame
        // while loading set animation
        //
    }
}
