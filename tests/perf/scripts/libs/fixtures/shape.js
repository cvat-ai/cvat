// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const LABEL_TYPES = ['rectangle', 'polygon', 'polyline', 'points', 'cuboid'];

const randomShape = () => randomItem(LABEL_TYPES);

export default {
    randomShape,
};
