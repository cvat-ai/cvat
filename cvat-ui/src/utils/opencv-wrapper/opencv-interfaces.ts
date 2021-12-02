// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
    currentProcessedImage: number | undefined;
}

export interface Tracking{
    init: (src: ImageData, x: number, y: number, width: number, height: number) => void;
    update: (src: ImageData) => void;
}
