// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';

interface SliceData {
    contour: number[];
    clientID: number;
    shapeType: 'mask' | 'polygon';
}

export interface SliceHandler {
    slice(sliceData: any): void;
    cancel(): void;
}

export class SliceHandlerImpl implements SliceHandler {
    private canvas: SVG.Container;
    private sliceData: SliceData | null;
    private hideObject: (clientID: number) => void;
    private showObject: (clientID: number) => void;

    public constructor(canvas: SVG.Container) {
        this.sliceData = null;
        this.canvas = canvas;
    }

    private initialize(sliceData: SliceData) {
        this.sliceData = { ...sliceData, contour: [...sliceData.contour] };


    }

    private release() {

    }

    public slice(sliceData: any) {

    }

    public cancel(): void {

    }
}
