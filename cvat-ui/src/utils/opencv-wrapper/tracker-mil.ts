// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { clamp } from 'utils/math';
import { TrackerModel, TrackingResult } from './opencv-interfaces';

export type TrackerMIL = TrackerModel;

export default class TrackerMILImplementation implements TrackerMIL {
    public name: string;
    private imageData: ImageData | null;
    private cv: any;
    private trackerMIL: any;

    constructor(cv: any) {
        this.cv = cv;
        this.trackerMIL = new cv.TrackerMIL();
        this.imageData = null;
        this.name = 'TrackerMil';
    }

    public init(src: ImageData, points: number[]): void {
        if (points.length !== 4) {
            throw Error(`TrackerMIL must be initialized with rectangle, but got ${points.length % 2} points.`);
        }
        this.imageData = src;

        // cut bounding box if its out of image bounds
        const x1 = clamp(points[0], 0, src.width);
        const y1 = clamp(points[1], 0, src.height);
        const x2 = clamp(points[2], 0, src.width);
        const y2 = clamp(points[3], 0, src.height);

        const [width, height] = [x2 - x1, y2 - y1];
        if (width === 0 || height === 0) {
            throw Error('TrackerMIL got rectangle out of image bounds');
        }

        let matImage = null;
        try {
            matImage = this.cv.matFromImageData(src);
            const rect = new this.cv.Rect(x1, y1, width, height);
            this.trackerMIL.init(matImage, rect);
        } finally {
            if (matImage) matImage.delete();
        }
    }

    public reinit(points: number[]): void {
        if (!this.imageData) {
            throw Error('TrackerMIL needs to be initialized before re-initialization');
        }
        this.trackerMIL.delete();
        this.trackerMIL = new this.cv.TrackerMIL();
        this.init(this.imageData, points);
    }

    public update(src: ImageData): TrackingResult {
        this.imageData = src;
        let matImage = null;
        try {
            matImage = this.cv.matFromImageData(src);
            const [updated, rect] = this.trackerMIL.update(matImage);
            return { updated, points: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height] };
        } finally {
            if (matImage) matImage.delete();
        }
    }

    public delete(): void {
        this.trackerMIL.delete();
    }
}
