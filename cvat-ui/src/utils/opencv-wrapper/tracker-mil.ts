// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Tracking, TrackingResult } from './opencv-interfaces';

export type TrackerMIL = Tracking;

export default class TrackerMILImplementation implements TrackerMIL {
    public name:string;
    public type:string;
    private cv:any;
    private trackerMIL:any;

    constructor(cv:any) {
        this.cv = cv;
        this.trackerMIL = new cv.TrackerMIL();
        this.name = 'TrackerMIL';
        this.type = 'opencv_tracker_mil';
    }

    public init(src: ImageData, x: number, y: number, width: number, height: number): void {
        const matImage = this.cv.matFromImageData(src);
        const rect = new this.cv.Rect(x, y, width, height);
        this.trackerMIL.init(matImage, rect);
        matImage.delete();
    }

    public update(src: ImageData): TrackingResult {
        const matImage = this.cv.matFromImageData(src);
        const [updated, rect] = this.trackerMIL.update(matImage);
        matImage.delete();
        return { updated, points: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height] };
    }
}
