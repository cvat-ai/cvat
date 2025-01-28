// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';
import FabricFilter from './fabric-wrapper';

export interface GammaFilterOptions {
    gamma: number[];
}

export default class GammaCorrection extends FabricFilter {
    #gamma: number[];

    constructor(options: GammaFilterOptions) {
        super();

        const { gamma } = options;
        if (!Array.isArray(gamma) || gamma.length !== 3) {
            throw Error(`Incorrect option for gamma filter, expected array: [R, G, B] got ${gamma}`);
        }

        // @ts-ignore: Some filters are not typed yet https://github.com/DefinitelyTyped/DefinitelyTyped/issues/62371
        this.filter = new fabric.Image.filters.Gamma({
            gamma,
        });
        this.#gamma = gamma;
    }

    public configure(options: object): void {
        super.configure(options);

        const { gamma: newGamma } = options as GammaFilterOptions;
        this.#gamma = newGamma;
    }

    get gamma(): number {
        return this.#gamma[0];
    }
}
