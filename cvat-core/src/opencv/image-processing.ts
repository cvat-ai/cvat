// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface SerializedImageFilter {
    alias: string;
    params: object;
}

export interface ImageProcessing {
    filter: any;
    currentProcessedImage: number | null;

    processImage: (src: ImageData, frameNumber: number) => ImageData;
    configure: (options: object) => void;
    toJSON: () => SerializedImageFilter;
}

/* eslint @typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
export class BaseImageFilter implements ImageProcessing {
    public filter: any = null;
    public currentProcessedImage: number | null = null;

    processImage(_r: ImageData, _frameNumber: number): ImageData {
        throw new Error('Process image is not implemented');
    }

    configure(_options: object): void {}

    toJSON(): SerializedImageFilter {
        throw new Error('Method is not implemented');
    }
}
