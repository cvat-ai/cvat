// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseImageFilter, ImageProcessing, ImageFilterAlias, SerializedImageFilter } from 'utils/image-processing';

export interface Heatmap extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

export default class HeatmapImplementation extends BaseImageFilter {
    private cv: any;
    private colormapType: number;

    constructor(cv: any, colormapType = 2) { // COLORMAP_JET = 2
        super();
        this.cv = cv;
        this.colormapType = colormapType;
    }

    public processImage(src: ImageData, frameNumber: number): ImageData {
        const { cv } = this;
        let matImage = null;
        const grayImage = new cv.Mat();
        const RGBDist = new cv.Mat();
        const RGBADist = new cv.Mat();

        try {
            this.currentProcessedImage = frameNumber;
            matImage = cv.matFromImageData(src);

            // Convert to grayscale first
            cv.cvtColor(matImage, grayImage, cv.COLOR_RGBA2GRAY, 0);

            // Create RGB heatmap manually using JET colormap approximation
            RGBDist.create(grayImage.rows, grayImage.cols, cv.CV_8UC3);

            for (let i = 0; i < grayImage.rows; i++) {
                for (let j = 0; j < grayImage.cols; j++) {
                    const value = grayImage.ucharAt(i, j) / 255.0;

                    // JET colormap approximation
                    let r = 0, g = 0, b = 0;

                    if (value < 0.125) {
                        b = 0.5 + 4 * value;
                    } else if (value < 0.375) {
                        g = 4 * (value - 0.125);
                        b = 1;
                    } else if (value < 0.625) {
                        r = 4 * (value - 0.375);
                        g = 1;
                        b = 1 - 4 * (value - 0.375);
                    } else if (value < 0.875) {
                        r = 1;
                        g = 1 - 4 * (value - 0.625);
                    } else {
                        r = 1 - 4 * (value - 0.875);
                    }

                    RGBDist.ucharPtr(i, j)[0] = Math.round(r * 255);
                    RGBDist.ucharPtr(i, j)[1] = Math.round(g * 255);
                    RGBDist.ucharPtr(i, j)[2] = Math.round(b * 255);
                }
            }

            // Convert to RGBA
            cv.cvtColor(RGBDist, RGBADist, cv.COLOR_RGB2RGBA, 0);

            const arr = new Uint8ClampedArray(RGBADist.data, RGBADist.cols, RGBADist.rows);
            const imgData = new ImageData(arr, src.width, src.height);
            return imgData;
        } catch (e: unknown) {
            throw e instanceof Error ? e : new Error('Unknown error');
        } finally {
            if (matImage) {
                matImage.delete();
            }
            grayImage.delete();
            RGBDist.delete();
            RGBADist.delete();
        }
    }

    public toJSON(): SerializedImageFilter {
        return {
            alias: ImageFilterAlias.HEATMAP,
            params: {
                colormapType: this.colormapType,
            },
        };
    }
}
