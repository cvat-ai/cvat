// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import { fabric } from 'fabric';

export interface ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
    currentProcessedImage: number | null;
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

export type ConfigurableFilterType = fabric.IBaseFilter;
export interface ConfigurableFilter extends ImageProcessing {
    filter: ConfigurableFilterType | null;
    configure: (options: object) => void;
}
