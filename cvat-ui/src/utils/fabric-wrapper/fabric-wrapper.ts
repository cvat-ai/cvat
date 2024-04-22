// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BaseImageFilter } from 'utils/image-processing';

export default class FabricFilter extends BaseImageFilter {
    public processImage(src: ImageData, frameNumber: number): ImageData {
        if (this.filter) {
            const dataCopy = new Uint8ClampedArray(src.data);
            const result = new ImageData(dataCopy, src.width, src.height);
            this.filter.applyTo2d({
                imageData: result,
            });
            this.currentProcessedImage = frameNumber;
            return result;
        }
        return src;
    }

    public configure(options: object): void {
        if (this.filter) {
            this.filter.setOptions(options);
        }
    }
}
