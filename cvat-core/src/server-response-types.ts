// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedModel } from 'core-types';

export interface FunctionsResponseBody {
    results: SerializedModel[];
    count: number;
}
