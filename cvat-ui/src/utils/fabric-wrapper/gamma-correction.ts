// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { filters } from 'fabric';
import { ImageFilterAlias, SerializedImageFilter } from 'utils/image-processing';
import FabricFilter from './fabric-wrapper';

export interface GammaFilterOptions {
    gamma: [number, number, number];
}

export default class GammaCorrection extends FabricFilter {
    #gamma: number[];

    constructor(options: GammaFilterOptions) {
        super();

        const { gamma } = options;
        if (!Array.isArray(gamma) || gamma.length !== 3) {
            throw Error(`Incorrect option for gamma filter, expected array: [R, G, B] got ${gamma}`);
        }

        this.filter = new filters.Gamma({
            gamma,
        });
        this.#gamma = gamma;
    }

    public configure(options: object): void {
        super.configure(options);

        const { gamma: newGamma } = options as GammaFilterOptions;
        this.#gamma = newGamma;
    }

    public toJSON(): SerializedImageFilter {
        return {
            alias: ImageFilterAlias.GAMMA_CORRECTION,
            params: {
                gamma: this.#gamma,
            },
        };
    }

    get gamma(): number {
        return this.#gamma[0];
    }
}
