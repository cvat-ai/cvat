// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _cvat from 'cvat-core/src/api';
import ObjectState from 'cvat-core/src/object-state';
import Webhook from 'cvat-core/src/webhook';
import MLModel from 'cvat-core/src/ml-model';
import { ModelProvider } from 'cvat-core/src/lambda-manager';
import {
    Label, Attribute, RawAttribute, RawLabel,
} from 'cvat-core/src/labels';
import {
    ShapeType, LabelType, ModelKind, ModelProviders, ModelReturnType,
} from 'cvat-core/src/enums';
import { Storage, StorageData } from 'cvat-core/src/storage';
import Issue from 'cvat-core/src/issue';
import Comment from 'cvat-core/src/comment';
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
    Issue,
    Comment,
    MLModel,
    ModelKind,
    ModelProviders,
    ModelReturnType,
};

export type {
    RawAttribute,
    RawLabel,
    StorageData,
    SocialAuthMethods,
    ModelProvider,
};
