// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { fabric } from 'fabric';
import FabricFilter from './fabric-wrapper';

export interface GammaFilterOptions {
    gamma: number[];
}

export default class GammaCorrection extends FabricFilter {
    constructor(options: GammaFilterOptions) {
        super();
        const { gamma } = options;
        if (!Array.isArray(gamma) || gamma.length !== 3) {
            throw Error('icorrect gamma');
        }
        this.filter = new fabric.Image.filters.Gamma({
            gamma,
        });
    }
}
