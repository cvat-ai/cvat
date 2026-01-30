// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseImageFilter, ImageProcessing, ImageFilterAlias, SerializedImageFilter } from 'utils/image-processing';

export interface OpenCVGamma extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

export default class OpenCVGammaImplementation extends BaseImageFilter {
    private cv: any;
    private gamma: number;

    constructor(cv: any, gamma = 1.0) {
        super();
        this.cv = cv;
        this.gamma = gamma;
    }

    public processImage(src: ImageData, frameNumber: number): ImageData {
        const { cv } = this;
        let matImage = null;
        const float32Image = new cv.Mat();
        const correctedFloat = new cv.Mat();
        const correctedImage = new cv.Mat();

        try {
            this.currentProcessedImage = frameNumber;
            matImage = cv.matFromImageData(src);

            // Convert to float32 for processing
            matImage.convertTo(float32Image, cv.CV_32F, 1.0 / 255.0);

            // Apply gamma correction: output = input^(1/gamma)
            const invGamma = 1.0 / this.gamma;
            cv.pow(float32Image, invGamma, correctedFloat);

            // Convert back to uint8
            correctedFloat.convertTo(correctedImage, cv.CV_8U, 255.0);

            const arr = new Uint8ClampedArray(correctedImage.data, correctedImage.cols, correctedImage.rows);
            const imgData = new ImageData(arr, src.width, src.height);
            return imgData;
        } catch (e: unknown) {
            throw e instanceof Error ? e : new Error('Unknown error');
        } finally {
            if (matImage) {
                matImage.delete();
            }
            float32Image.delete();
            correctedFloat.delete();
            correctedImage.delete();
        }
    }

    public toJSON(): SerializedImageFilter {
        return {
            alias: ImageFilterAlias.OPENCV_GAMMA,
            params: {
                gamma: this.gamma,
            },
        };
    }
}
