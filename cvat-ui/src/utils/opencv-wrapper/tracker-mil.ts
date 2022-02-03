// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { convertPointInBounds } from 'utils/math';
import { TrackerModel, TrackingResult } from './opencv-interfaces';

export type TrackerMIL = TrackerModel;

export default class TrackerMILImplementation implements TrackerMIL {
    public name: string;
    private prevImageData: ImageData | null;
    private cv:any;
    private trackerMIL:any;

    constructor(cv:any) {
        this.cv = cv;
        this.trackerMIL = new cv.TrackerMIL();
        this.prevImageData = null;
        this.name = 'TrackerMil';
    }

    public init(src: ImageData, points: number[]): void {
        if (points.length !== 4) {
            throw Error(`TrackerMIL must be initialized with rectangle, but got ${points.length % 2} points.`);
        }
        this.prevImageData = src;

        // cut bounding box if its out of image bounds
        const { x: x1, y: y1 } = convertPointInBounds(points[0], points[1], src.width, src.height);
        const { x: x2, y: y2 } = convertPointInBounds(points[2], points[3], src.width, src.height);

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
        if (!this.prevImageData) {
            throw Error('TrackerMIL needs to be initialized before re-initialization');
        }
        this.init(this.prevImageData, points);
    }

    public update(src: ImageData): TrackingResult {
        this.prevImageData = src;
        let matImage = null;
        try {
            matImage = this.cv.matFromImageData(src);
            const [updated, rect] = this.trackerMIL.update(matImage);
            return { updated, points: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height] };
        } finally {
            if (matImage) matImage.delete();
        }
    }
}
