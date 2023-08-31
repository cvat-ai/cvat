// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';
import { ImageProcessing } from '../opencv-wrapper/opencv-interfaces';

export interface GammaCorrection extends ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
}

export default class GammaCorrectionImplementation implements GammaCorrection {
    public currentProcessedImage: number | null = null;

    public processImage(src: ImageData, frameNumber: number): ImageData {
        console.log('Gamma called');
        const f = new fabric.Image.filters.Gamma({
            gamma: [0.5, 0.5, 0.5],
        });
        // f.setOptions({
        //     gamma: [1, 1, 1],
        // });
        f.applyTo2d({
            imageData: src,
        });
        this.currentProcessedImage = frameNumber;
        return src;
    }
}
