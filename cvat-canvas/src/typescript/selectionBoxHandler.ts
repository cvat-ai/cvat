// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import { Geometry } from './canvasModel';
import { BoxSelector } from './box-selector';

export interface SelectionBoxHandler {
    startBoxSelection(event: MouseEvent): void;
    cancelBoxSelection(): void;
    transform(geometry: Geometry): void;
}

/**
 * Handles the user drawing a box on the canvas to select multiple objects
 */
export class SelectionBoxHandlerImpl implements SelectionBoxHandler {
    private readonly boxSelector: BoxSelector;

    public constructor(
        private readonly onSelectRegion: (x: number, y: number, width: number, height: number) => void,
        canvas: SVG.Container,
        geometry: Geometry,
    ) {
        this.boxSelector = new BoxSelector(this.onBoxDrawn.bind(this), canvas, geometry, 'cvat_canvas_zoom_selection');
    }

    /**
     * Enters drawing mode, where the next click will start drawing a box.
     * @param event optional click event that already ocurred to trigger the box drawing
     */
    public startBoxSelection(event?: MouseEvent): void {
        this.boxSelector.startDrawingMode(event);
    }

    public cancelBoxSelection(): void {
        this.boxSelector.cancelDrawingMode();
    }

    public transform(geometry: Geometry): void {
        this.boxSelector.transform(geometry);
    }

    private onBoxDrawn(x: number, y: number, width: number, height: number): void {
        this.boxSelector.cancelDrawingMode();

        if (width > 1 && height > 1) {
            this.onSelectRegion(x, y, width, height);
        }
    }
}
