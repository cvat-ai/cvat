// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseImageFilter, ImageFilterSettings, ImageProcessing } from 'utils/image-processing';

export interface ImageEqualization extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

abstract class BaseImageEqualizationFilter extends BaseImageFilter {
    protected cv: any;

    constructor(cv: any) {
        super();
        this.cv = cv;
    }

    protected abstract applyEqualization(Y: any): any;

    protected processImageEqualization(src: ImageData, frameNumber: number): ImageData {
        const { cv } = this;
        let matImage = null;
        const RGBImage = new cv.Mat();
        const YUVImage = new cv.Mat();
        const RGBDist = new cv.Mat();
        const YUVDist = new cv.Mat();
        const RGBADist = new cv.Mat();
        let channels = new cv.MatVector();

        try {
            this.currentProcessedImage = frameNumber;
            matImage = cv.matFromImageData(src);
            cv.cvtColor(matImage, RGBImage, cv.COLOR_RGBA2RGB, 0);
            cv.cvtColor(RGBImage, YUVImage, cv.COLOR_RGB2YUV, 0);

            // Split channels and process luminance
            cv.split(YUVImage, channels);
            const [Y, U, V] = [channels.get(0), channels.get(1), channels.get(2)];
            channels.delete();

            const processedY = this.applyEqualization(Y);
            Y.delete();

            // Merge back
            channels = new cv.MatVector();
            channels.push_back(processedY);
            processedY.delete();
            channels.push_back(U); U.delete();
            channels.push_back(V); V.delete();

            cv.merge(channels, YUVDist);
            cv.cvtColor(YUVDist, RGBDist, cv.COLOR_YUV2RGB, 0);
            cv.cvtColor(RGBDist, RGBADist, cv.COLOR_RGB2RGBA, 0);

            return new ImageData(
                new Uint8ClampedArray(RGBADist.data, RGBADist.cols, RGBADist.rows),
                src.width,
                src.height,
            );
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

export class HistogramEqualizationImplementation extends BaseImageEqualizationFilter {
    protected applyEqualization(Y: any): any {
        const equalizedY = new this.cv.Mat();
        this.cv.equalizeHist(Y, equalizedY);
        return equalizedY;
    }

    public processImage(src: ImageData, frameNumber: number): ImageData {
        return this.processImageEqualization(src, frameNumber);
    }
}

export class CLAHEqualizationImplementation extends BaseImageEqualizationFilter {
    private settings: ImageFilterSettings;

    constructor(cv: any) {
        super(cv);
        this.settings = new ImageFilterSettings();
    }

    public configure(options: ImageFilterSettings): void {
        if (options.claheClipLimit !== null) {
            this.settings.claheClipLimit = options.claheClipLimit;
        }
        if (options.claheTileGridSize.columns !== null) {
            this.settings.claheTileGridSize.columns = options.claheTileGridSize.columns;
        }
        if (options.claheTileGridSize.rows !== null) {
            this.settings.claheTileGridSize.rows = options.claheTileGridSize.rows;
        }
    }

    protected applyEqualization(Y: any): any {
        const tileGridSize = new this.cv.Size(
            this.settings.claheTileGridSize.columns,
            this.settings.claheTileGridSize.rows,
        );
        const clahe = new this.cv.CLAHE(this.settings.claheClipLimit, tileGridSize);
        const equalizedY = new this.cv.Mat();

        clahe.apply(Y, equalizedY);
        clahe.delete();

        return equalizedY;
    }

    public processImage(src: ImageData, frameNumber: number): ImageData {
        return this.processImageEqualization(src, frameNumber);
    }
}
