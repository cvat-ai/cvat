// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Tracking } from './opencv-interfaces';

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

    public update(src: ImageData): void {
        const matImage = this.cv.matFromImageData(src);
        const [updated, rect] = this.trackerMIL.update(matImage);
        if (updated) {
            console.log('success', rect.x, rect.y, rect.width, rect.height);
        } else {
            console.log('fail');
        }
        matImage.delete();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result = {
            x: rect.x, y: rect.y, widthR: rect.width, heightR: rect.height,
        };
    }
}
