// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseImageFilter, ImageProcessing, ImageFilterAlias, SerializedImageFilter } from 'utils/image-processing';

export interface Sharpen extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

export default class SharpenImplementation extends BaseImageFilter {
    private cv: any;
    private strength: number;

    constructor(cv: any, strength = 1.0) {
        super();
        this.cv = cv;
        this.strength = strength;
    }

    public processImage(src: ImageData, frameNumber: number): ImageData {
        const { cv } = this;
        let matImage = null;
        const blurred = new cv.Mat();
        const sharpened = new cv.Mat();

        try {
            this.currentProcessedImage = frameNumber;
            matImage = cv.matFromImageData(src);

            // Apply Gaussian blur
            const ksize = new cv.Size(0, 0);
            cv.GaussianBlur(matImage, blurred, ksize, 3, 0, cv.BORDER_DEFAULT);

            // Sharpen by adding weighted difference
            // sharpened = image + strength * (image - blurred)
            const weight = 1 + this.strength;
            cv.addWeighted(matImage, weight, blurred, -this.strength, 0, sharpened);

            const arr = new Uint8ClampedArray(sharpened.data, sharpened.cols, sharpened.rows);
            const imgData = new ImageData(arr, src.width, src.height);
            return imgData;
        } catch (e: unknown) {
            throw e instanceof Error ? e : new Error('Unknown error');
        } finally {
            if (matImage) {
                matImage.delete();
            }
            blurred.delete();
            sharpened.delete();
        }
    }

    public toJSON(): SerializedImageFilter {
        return {
            alias: ImageFilterAlias.SHARPEN,
            params: {
                strength: this.strength,
            },
        };
    }
}
