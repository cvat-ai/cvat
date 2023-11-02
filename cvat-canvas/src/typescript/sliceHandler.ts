// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import { stringifyToCanvas } from './shared';
import { Geometry, SliceData } from './canvasModel';
import consts from './consts';

export interface SliceHandler {
    slice(sliceData: any): void;
    cancel(): void;
}

export class SliceHandlerImpl implements SliceHandler {
    private canvas: SVG.Container;
    private start: number;
    private sliceData: Required<SliceData> | null;
    private shapeContour: SVG.Polygon | null;
    private slicingLine: SVG.PolyLine | null;
    private hideObject: (clientID: number) => void;
    private showObject: (clientID: number) => void;
    private onSliceDone: (clientID: number, fragments: number[][], duration: number) => void;
    private geometry: Geometry;
    private hiddenClientIDs: number[];

    public constructor(
        hideObject: SliceHandlerImpl['hideObject'],
        showObject: SliceHandlerImpl['showObject'],
        onSliceDone: SliceHandlerImpl['onSliceDone'],
        geometry: Geometry,
        canvas: SVG.Container,
    ) {
        this.hideObject = hideObject;
        this.showObject = showObject;
        this.onSliceDone = onSliceDone;
        this.geometry = geometry;
        this.canvas = canvas;
        this.sliceData = null;
        this.start = Date.now();
        this.shapeContour = null;
        this.slicingLine = null;
        this.hiddenClientIDs = [];
    }

    private initialize(sliceData: Required<SliceData>): void {
        this.sliceData = { ...sliceData, contour: [...sliceData.contour] };
        this.hiddenClientIDs = (this.canvas.select('.cvat_canvas_shape') as any).members
            .map((shape) => +shape.attr('clientID'));
        this.hiddenClientIDs.forEach((clientIDs) => {
            this.hideObject(clientIDs);
        });

        this.start = Date.now();
        this.shapeContour = this.canvas.polygon(stringifyToCanvas(sliceData.contour));
        this.slicingLine = this.canvas.polyline();
        this.slicingLine.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });
        this.shapeContour.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });

        // настраиваем mousemove, click и т.д. эвенты
        // мы не даем поставить точку вне контура в эвенте click
    }

    private release() {
        this.hiddenClientIDs.forEach((clientIDs) => {
            this.showObject(clientIDs);
        });

        if (this.slicingLine) {
            this.slicingLine.remove();
            this.slicingLine = null;
        }

        if (this.shapeContour) {
            this.shapeContour.remove();
            this.shapeContour = null;
        }

        this.sliceData = null;
    }

    public slice(sliceData: SliceData) {
        if (sliceData.enabled &&
            sliceData.clientID &&
            sliceData.contour &&
            sliceData.shapeType &&
            !this.sliceData?.enabled
        ) {
            this.initialize(sliceData as Required<SliceData>);
        } else if (this.sliceData?.enabled && !sliceData.enabled) {
            this.release();
            const results = [[], []];
            if (true) {
                this.onSliceDone(this.sliceData.clientID, results, Date.now() - this.start);
            }
        }
    }

    public cancel(): void {
        if (this.sliceData?.enabled) {
            this.release();
        }
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        if (this.slicingLine) {
            this.slicingLine.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale });
        }

        if (this.shapeContour) {
            this.shapeContour.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale });
        }
    }
}
