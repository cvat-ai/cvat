// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import _cvat from 'cvat-core/src/api';
import ObjectState from 'cvat-core/src/object-state';
import Webhook from 'cvat-core/src/webhook';
import MLModel from 'cvat-core/src/ml-model';
import {
    Label, Attribute, RawAttribute, RawLabel,
} from 'cvat-core/src/labels';
import { ShapeType, LabelType, ModelType } from 'cvat-core/src/enums';
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
    Attribute,
    ShapeType,
    LabelType,
    Storage,
    Webhook,
    SocialAuthMethod,
    MLModel,
    ModelType,
};

export type {
    RawAttribute,
    RawLabel,
    StorageData,
    SocialAuthMethods,
};
