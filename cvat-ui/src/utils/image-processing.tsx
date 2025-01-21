// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';

export type ConfigurableFilterType = fabric.IBaseFilter;
export interface ImageProcessing {
    filter: ConfigurableFilterType | null;
    currentProcessedImage: number | null;

    processImage: (src: ImageData, frameNumber: number) => ImageData;
    configure: (options: object) => void;
}

/* eslint @typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
export class BaseImageFilter implements ImageProcessing {
    public filter: fabric.IBaseFilter | null = null;
    public currentProcessedImage: number | null = null;

    processImage(_r: ImageData, _frameNumber: number): ImageData {
        throw new Error('Process image is not implemented');
    }

    configure(_options: object): void {}
}

export interface ImageFilter {
    modifier: ImageProcessing,
    alias: ImageFilterAlias
}

export enum ImageFilterAlias {
    HISTOGRAM_EQUALIZATION = 'opencv.histogramEqualizaton',
    GAMMA_CORRECTION = 'fabric.gammaCorrection',
}

export function hasFilter(filters: ImageFilter[], alias: ImageFilterAlias): ImageFilter | null {
    const index = filters.findIndex((imageFilter) => imageFilter.alias === alias);
    if (index !== -1) {
        return filters[index];
    }
    return null;
}
