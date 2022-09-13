// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import _cvat from 'cvat-core/src/api';
import ObjectState from 'cvat-core/src/object-state';
import {
    Label, Attribute, RawAttribute, RawLabel,
} from 'cvat-core/src/labels';
import { ShapeType } from 'cvat-core/src/enums';

const cvat: any = _cvat;

cvat.config.backendAPI = '/api';
cvat.config.origin = window.location.origin;
cvat.config.uploadChunkSize = 100;
(globalThis as any).cvat = cvat;

function getCore(): any {
    return cvat;
}

export {
    getCore,
    ObjectState,
    Label,
    Attribute,
    ShapeType,
};

export type {
    RawAttribute,
    RawLabel,
};
