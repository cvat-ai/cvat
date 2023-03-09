// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _cvat from 'cvat-core/src/api';
import ObjectState from 'cvat-core/src/object-state';
import Webhook from 'cvat-core/src/webhook';
import MLModel from 'cvat-core/src/ml-model';
import { ModelProvider } from 'cvat-core/src/lambda-manager';
import {
    Label, Attribute,
} from 'cvat-core/src/labels';
import { SerializedAttribute, SerializedLabel } from 'cvat-core/src/server-response-types';
import { Job, Task } from 'cvat-core/src/session';
import Project from 'cvat-core/src/project';
import {
    ShapeType, LabelType, ModelKind, ModelProviders, ModelReturnType, DimensionType,
} from 'cvat-core/src/enums';
import { Storage, StorageData } from 'cvat-core/src/storage';
import Issue from 'cvat-core/src/issue';
import Comment from 'cvat-core/src/comment';
import { SocialAuthMethods, SocialAuthMethod, SelectionSchema } from 'cvat-core/src/auth-methods';

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
    Project,
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
    SelectionSchema,
    DimensionType,
};

export type {
    SerializedAttribute,
    SerializedLabel,
    StorageData,
    SocialAuthMethods,
    ModelProvider,
};
