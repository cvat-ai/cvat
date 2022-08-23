// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import { Geometry } from './canvasModel';
import { BoxSelector } from './box-selector';

export interface ZoomHandler {
    zoom(): void;
    cancel(): void;
    transform(geometry: Geometry): void;
}

/**
 * Handles the user drawing a box on the canvas to zoom to that region
 */
export class ZoomHandlerImpl implements ZoomHandler {
    private readonly boxSelector: BoxSelector;

    public constructor(
        onZoomRegion: (x: number, y: number, width: number, height: number) => void,
        canvas: SVG.Container,
        geometry: Geometry,
    ) {
        this.boxSelector = new BoxSelector(onZoomRegion, canvas, geometry, 'cvat_canvas_zoom_selection');
    }

    public zoom(): void {
        this.boxSelector.startDrawingMode();
    }

    public cancel(): void {
        this.boxSelector.cancelDrawingMode();
    }

    public transform(geometry: Geometry): void {
        this.boxSelector.transform(geometry);
    }
}
