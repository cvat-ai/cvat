// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { SerializedShape } from '../server-response-types';
import { Shape } from './shape';
import type { AnnotationInjection } from './types';

export class PolyShape extends Shape {
    constructor(
        data: SerializedShape | SerializedShape['elements'][0],
        clientID: number,
        color: string,
        injection: AnnotationInjection,
    ) {
        super(data, clientID, color, injection);
        this.rotation = 0; // is not supported
    }
}
