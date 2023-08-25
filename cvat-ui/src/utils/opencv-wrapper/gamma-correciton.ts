// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ImageProcessing } from './opencv-interfaces';

export interface GammaCorrection extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

export default class GammaCorrectionImplementation implements GammaCorrection {
    private cv: any;
    public currentProcessedImage: number | undefined;

    constructor(cv: any) {
        this.cv = cv;
    }

    public processImage(src: ImageData, frameNumber: number): ImageData {
        console.log('Gamma called');
        const gammaParam = 3.0;
        const inverseGamma = 1.0 / gammaParam;
        const lut = [];
        for (let i = 0; i < 256; i++) {
            lut[i] = Math.floor(255 * ((i / 255) ** inverseGamma));
        }
        // const { cv } = this;
        // console.log(cv.getBuildInformation());
        // let matImage = null;
        // matImage = cv.matFromImageData(src);
        for (let i = 0; i < src.data.length; i += 4) {
            src.data[i + 0] = lut[src.data[i + 0]];
            src.data[i + 1] = lut[src.data[i + 1]];
            src.data[i + 2] = lut[src.data[i + 2]];
        }
        // matImage = new cv.Mat();
        // const lut = new cv.Mat.zeros(256, 4, cv.CV_8S);
        // const out = new cv.Mat();
        // console.log(matImage, lut, out);
        // cv.LUT(matImage, lut, out);
        // const arr = new Uint8ClampedArray(matImage.data, matImage.cols, matImage.rows);
        // const imgData = new ImageData(arr, src.width, src.height);
        // matImage.delete();
        this.currentProcessedImage = frameNumber;
        return src;
    }
}
