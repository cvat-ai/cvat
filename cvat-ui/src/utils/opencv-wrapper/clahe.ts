// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseImageFilter, ImageProcessing, ImageFilterAlias, SerializedImageFilter } from 'utils/image-processing';

export interface CLAHE extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

export default class CLAHEImplementation extends BaseImageFilter {
    private cv: any;
    private clipLimit: number;
    private tileGridSize: [number, number];

    constructor(cv: any, clipLimit = 2.0, tileGridSize: [number, number] = [8, 8]) {
        super();
        this.cv = cv;
        this.clipLimit = clipLimit;
        this.tileGridSize = tileGridSize;
    }

    public processImage(src: ImageData, frameNumber: number): ImageData {
        const { cv } = this;
        let matImage = null;
        const RGBImage = new cv.Mat();
        const LABImage = new cv.Mat();
        const LABDist = new cv.Mat();
        const RGBDist = new cv.Mat();
        const RGBADist = new cv.Mat();
        let channels = new cv.MatVector();
        const equalizedL = new cv.Mat();

        try {
            this.currentProcessedImage = frameNumber;
            matImage = cv.matFromImageData(src);
            cv.cvtColor(matImage, RGBImage, cv.COLOR_RGBA2RGB, 0);
            cv.cvtColor(RGBImage, LABImage, cv.COLOR_RGB2Lab, 0);
            cv.split(LABImage, channels);

            const [L, A, B] = [channels.get(0), channels.get(1), channels.get(2)];

            // Create CLAHE object
            const clahe = new cv.CLAHE(this.clipLimit, new cv.Size(this.tileGridSize[0], this.tileGridSize[1]));
            clahe.apply(L, equalizedL);
            clahe.delete();

            channels.delete();
            L.delete();

            channels = new cv.MatVector();
            channels.push_back(equalizedL);
            equalizedL.delete();
            channels.push_back(A);
            A.delete();
            channels.push_back(B);
            B.delete();

            cv.merge(channels, LABDist);
            cv.cvtColor(LABDist, RGBDist, cv.COLOR_Lab2RGB, 0);
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
            if (channels) {
                channels.delete();
            }
            RGBImage.delete();
            LABImage.delete();
            LABDist.delete();
            RGBDist.delete();
            RGBADist.delete();
        }
    }

    public toJSON(): SerializedImageFilter {
        return {
            alias: ImageFilterAlias.CLAHE,
            params: {
                clipLimit: this.clipLimit,
                tileGridSize: this.tileGridSize,
            },
        };
    }
}
