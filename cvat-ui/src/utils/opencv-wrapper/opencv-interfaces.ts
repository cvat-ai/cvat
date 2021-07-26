// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface ImageProcessing {
    processImage: (src: ImageData, frameNumber: number) =>ImageData|undefined;
    restoreImage: () => ImageData|undefined;
    currentProcessedImage: number|undefined
}
