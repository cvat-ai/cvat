// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) => ImageData;
    currentProcessedImage: number | undefined;
}

export interface TrackingResult{
    updated: boolean;
    points: any[];
}

export interface Tracking{
    name: string;
    type: string;
    init: (src: ImageData, points: number[]) => void;
    reinit: (points: number[]) => void;
    update: (src: ImageData) => TrackingResult;
}
