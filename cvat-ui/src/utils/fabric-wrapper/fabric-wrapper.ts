// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { IBaseFilter } from 'fabric/fabric-impl';
import { ConfigurableFilter } from 'utils/image-processing';

export default class FabricFilter implements ConfigurableFilter {
    public filter: IBaseFilter | null = null;
    public currentProcessedImage: number | null = null;

    public processImage(src: ImageData, frameNumber: number): ImageData {
        if (this.filter) {
            this.filter.applyTo2d({
                imageData: src,
            });
            this.currentProcessedImage = frameNumber;
        }
        return src;
    }

    public configure(options: object): void {
        if (this.filter) {
            this.filter.setOptions(options);
        }
    }
}
