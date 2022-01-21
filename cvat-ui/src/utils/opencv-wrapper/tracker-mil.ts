// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Tracking, TrackingResult } from './opencv-interfaces';

export type TrackerMIL = Tracking;

export default class TrackerMILImplementation implements TrackerMIL {
    public name:string;
    public type:string;
    private prevImageData: ImageData | null;
    private cv:any;
    private trackerMIL:any;

    constructor(cv:any) {
        this.cv = cv;
        this.trackerMIL = new cv.TrackerMIL();
        this.name = 'TrackerMIL';
        this.type = 'opencv_tracker_mil';
        this.prevImageData = null;
    }

    public init(src: ImageData, points: number[]): void {
        if (points.length !== 4) {
            throw Error(`TrackerMIL must be initialized with rect, but got ${points.length % 2} points.`);
        }
        this.prevImageData = src;
        const [x, y, width, height] = [points[0], points[1], points[2] - points[0], points[3] - points[1]];
        const matImage = this.cv.matFromImageData(src);
        const rect = new this.cv.Rect(x, y, width, height);
        this.trackerMIL.init(matImage, rect);
        matImage.delete();
    }

    public reinit(points: number[]): void {
        if (points.length !== 4) {
            throw Error(`TrackerMIL must be initialized with rect, but got ${points.length % 2} points.`);
        }
        if (!this.prevImageData) {
            throw Error('TrackerMIL needs to be initialized before re-initialization');
        }
        this.init(this.prevImageData, points);
    }

    public update(src: ImageData): TrackingResult {
        this.prevImageData = src;
        const matImage = this.cv.matFromImageData(src);
        const [updated, rect] = this.trackerMIL.update(matImage);
        matImage.delete();
        return { updated, points: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height] };
    }
}
