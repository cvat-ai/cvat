// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseImageFilter, ImageProcessing } from 'utils/image-processing';

export interface HistogramEqualization extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

export default class HistogramEqualizationImplementation extends BaseImageFilter {
    private cv:any;

    constructor(cv:any) {
        super();
        this.cv = cv;
    }

    public processImage(src:ImageData, frameNumber: number) : ImageData {
        const { cv } = this;
        let matImage = null;
        const RGBImage = new cv.Mat();
        const YUVImage = new cv.Mat();
        const RGBDist = new cv.Mat();
        const YUVDist = new cv.Mat();
        const RGBADist = new cv.Mat();
        let channels = new cv.MatVector();
        const equalizedY = new cv.Mat();
        try {
            this.currentProcessedImage = frameNumber;
            matImage = cv.matFromImageData(src);
            cv.cvtColor(matImage, RGBImage, cv.COLOR_RGBA2RGB, 0);
            cv.cvtColor(RGBImage, YUVImage, cv.COLOR_RGB2YUV, 0);
            cv.split(YUVImage, channels);
            const [Y, U, V] = [channels.get(0), channels.get(1), channels.get(2)];
            channels.delete();
            channels = null;
            cv.equalizeHist(Y, equalizedY);
            Y.delete();
            channels = new cv.MatVector();
            channels.push_back(equalizedY); equalizedY.delete();
            channels.push_back(U); U.delete();
            channels.push_back(V); V.delete();
            cv.merge(channels, YUVDist);
            cv.cvtColor(YUVDist, RGBDist, cv.COLOR_YUV2RGB, 0);
            cv.cvtColor(RGBDist, RGBADist, cv.COLOR_RGB2RGBA, 0);
            const arr = new Uint8ClampedArray(RGBADist.data, RGBADist.cols, RGBADist.rows);
            const imgData = new ImageData(arr, src.width, src.height);
            return imgData;
        } catch (e) {
            throw new Error(e.toString());
        } finally {
            if (matImage) matImage.delete();
            if (channels) channels.delete();
            RGBImage.delete();
            YUVImage.delete();
            RGBDist.delete();
            YUVDist.delete();
            RGBADist.delete();
        }
    }
}
