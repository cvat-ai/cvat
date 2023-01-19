// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _cvat from 'cvat-core/src/api';
import ObjectState from 'cvat-core/src/object-state';
import Webhook from 'cvat-core/src/webhook';
import {
    Label, Attribute, RawAttribute, RawLabel,
} from 'cvat-core/src/labels';
import { Job, Task } from 'cvat-core/src/session';
import { ShapeType, LabelType } from 'cvat-core/src/enums';
import { Storage, StorageData } from 'cvat-core/src/storage';
import { SocialAuthMethods, SocialAuthMethod } from 'cvat-core/src/auth-methods';

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
    Job,
    Task,
    Attribute,
    ShapeType,
    LabelType,
    Storage,
    Webhook,
    SocialAuthMethod,
};

export type {
    RawAttribute,
    RawLabel,
    StorageData,
    SocialAuthMethods,
};
