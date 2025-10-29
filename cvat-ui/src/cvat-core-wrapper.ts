// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import CVATCore from 'cvat-core/src';
import _cvat from 'cvat-core/src/api';

import ObjectState from 'cvat-core/src/object-state';
import Webhook from 'cvat-core/src/webhook';
import MLModel from 'cvat-core/src/ml-model';
import CloudStorage from 'cvat-core/src/cloud-storage';
import {
    Label, Attribute,
} from 'cvat-core/src/labels';
import {
    SerializedAttribute, SerializedLabel, SerializedAPISchema,
    OrganizationMembersFilter, AnalyticsEventsFilter, SerializedApiToken,
    ApiTokensFilter,
} from 'cvat-core/src/server-response-types';
import { ApiTokenModifiableFields } from 'cvat-core/src/server-request-types';
import { UpdateStatusData } from 'cvat-core/src/core-types';
import { Job, Task } from 'cvat-core/src/session';
import Project from 'cvat-core/src/project';
import QualityReport, { QualitySummary } from 'cvat-core/src/quality-report';
import QualityConflict, { AnnotationConflict, ConflictSeverity } from 'cvat-core/src/quality-conflict';
import QualitySettings, { TargetMetric, QualitySettingsSaveFields } from 'cvat-core/src/quality-settings';
import ConsensusSettings from 'cvat-core/src/consensus-settings';
import ApiToken from 'cvat-core/src/api-token';
import { FramesMetaData, FrameData } from 'cvat-core/src/frames';
import { ServerError, RequestError } from 'cvat-core/src/exceptions';
import {
    ShapeType, ObjectType, LabelType, ModelKind, ModelProviders,
    DimensionType, JobType, Source, MembershipRole,
    JobStage, JobState, RQStatus, StorageLocation,
} from 'cvat-core/src/enums';
import { Storage, StorageData } from 'cvat-core/src/storage';
import Issue from 'cvat-core/src/issue';
import Comment from 'cvat-core/src/comment';
import User from 'cvat-core/src/user';
import Organization, { Membership, Invitation } from 'cvat-core/src/organization';
import AnnotationGuide from 'cvat-core/src/guide';
import { JobValidationLayout, TaskValidationLayout } from 'cvat-core/src/validation-layout';
import AnnotationFormats, { Dumper, Loader } from 'cvat-core/src/annotation-formats';
import { Event } from 'cvat-core/src/event';
import { APIWrapperEnterOptions } from 'cvat-core/src/plugins';
import { BaseShapesAction } from 'cvat-core/src/annotations-actions/base-shapes-action';
import { BaseCollectionAction } from 'cvat-core/src/annotations-actions/base-collection-action';
import { ActionParameterType, BaseAction } from 'cvat-core/src/annotations-actions/base-action';
import { Request, RequestOperation } from 'cvat-core/src/request';
import AboutData from 'cvat-core/src/about';
import { MinimalShape, TrackerResults, InteractorResults } from 'cvat-core/src/lambda-manager';

const cvat: CVATCore = _cvat;

cvat.config.backendAPI = '/api';
cvat.config.origin = window.location.origin;
// Set the TUS chunk size to 2 MB. A small value works better in case of a slow internet connection.
// A larger value may cause a server-side timeout errors in the current implementation.
cvat.config.uploadChunkSize = 2;
(globalThis as any).cvat = cvat;

function getCore(): typeof cvat {
    return cvat;
}

type ProjectOrTaskOrJob = Project | Task | Job;

export {
    getCore,
    ObjectState,
    Label,
    Job,
    Task,
    Project,
    AnnotationGuide,
    Attribute,
    ShapeType,
    Source,
    ObjectType,
    LabelType,
    Storage,
    Webhook,
    Issue,
    User,
    CloudStorage,
    Organization,
    Membership,
    Invitation,
    Comment,
    MLModel,
    ModelKind,
    ModelProviders,
    DimensionType,
    AnnotationFormats,
    Dumper,
    Loader,
    JobType,
    JobStage,
    JobState,
    RQStatus,
    BaseAction,
    BaseShapesAction,
    BaseCollectionAction,
    QualityReport,
    QualityConflict,
    QualitySettings,
    ConsensusSettings,
    ApiToken,
    TargetMetric,
    AnnotationConflict,
    ConflictSeverity,
    FramesMetaData,
    ServerError,
    RequestError,
    Event,
    FrameData,
    ActionParameterType,
    Request,
    JobValidationLayout,
    TaskValidationLayout,
    StorageLocation,
    MembershipRole,
    AboutData,
};

export type {
    SerializedAttribute,
    SerializedLabel,
    SerializedApiToken,
    StorageData,
    APIWrapperEnterOptions,
    QualitySummary,
    CVATCore,
    SerializedAPISchema,
    ProjectOrTaskOrJob,
    RequestOperation,
    UpdateStatusData,
    OrganizationMembersFilter,
    QualitySettingsSaveFields,
    AnalyticsEventsFilter,
    MinimalShape,
    InteractorResults,
    TrackerResults,
    ApiTokenModifiableFields,
    ApiTokensFilter,
};
