// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    AnalyticsEventsFilter, QualityConflictsFilter, QualityReportsFilter,
    QualitySettingsFilter, ConsensusSettingsFilter,
} from './server-response-types';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import lambdaManager from './lambda-manager';
import { AnnotationFormats } from './annotation-formats';
import logger from './logger';
import * as enums from './enums';
import config from './config';
import {
    mask2Rle, rle2Mask, propagateShapes, validateAttributeValue,
} from './object-utils';
import User from './user';
import Project from './project';
import { Job, Task } from './session';
import { Event } from './event';
import { Attribute, Label } from './labels';
import Statistics from './statistics';
import ObjectState from './object-state';
import MLModel from './ml-model';
import Issue from './issue';
import Comment from './comment';
import { FrameData, FramesMetaData } from './frames';
import CloudStorage from './cloud-storage';
import Organization, { Invitation } from './organization';
import Webhook from './webhook';
import QualityReport from './quality-report';
import QualityConflict from './quality-conflict';
import QualitySettings from './quality-settings';
import ConsensusSettings from './consensus-settings';
import AnnotationGuide from './guide';
import { JobValidationLayout, TaskValidationLayout } from './validation-layout';
import { Request } from './request';
import AboutData from './about';
import {
    runAction,
    callAction,
    listActions,
    registerAction,
    unregisterAction,
} from './annotations-actions/annotations-actions';
import { BaseCollectionAction } from './annotations-actions/base-collection-action';
import { BaseShapesAction } from './annotations-actions/base-shapes-action';
import {
    ArgumentError, DataError, Exception, ScriptingError, ServerError,
} from './exceptions';
import { PaginatedResource } from './core-types';

export default interface CVATCore {
    plugins: {
        list: typeof PluginRegistry.list;
        register: typeof PluginRegistry.register;
    };
    lambda: {
        list: typeof lambdaManager.list;
        run: typeof lambdaManager.run;
        call: typeof lambdaManager.call;
        cancel: typeof lambdaManager.cancel;
        listen: typeof lambdaManager.listen;
        requests: typeof lambdaManager.requests;
    };
    server: {
        about: () => Promise<AboutData>;
        share: (dir: string) => Promise<{
            mimeType: string;
            name: string;
            type: enums.ShareFileType;
        }[]>;
        formats: () => Promise<AnnotationFormats>;
        userAgreements: typeof serverProxy.server.userAgreements;
        register: (
            username: string,
            firstName: string,
            lastName: string,
            email: string,
            password: string,
            userConfirmations: Record<string, string>,
        ) => Promise<User>;
        login: typeof serverProxy.server.login;
        logout: typeof serverProxy.server.logout;
        changePassword: typeof serverProxy.server.changePassword;
        requestPasswordReset: typeof serverProxy.server.requestPasswordReset;
        resetPassword: typeof serverProxy.server.resetPassword;
        authenticated: typeof serverProxy.server.authenticated;
        healthCheck: typeof serverProxy.server.healthCheck;
        request: typeof serverProxy.server.request;
        setAuthData: typeof serverProxy.server.setAuthData;
        installedApps: typeof serverProxy.server.installedApps;
        apiSchema: typeof serverProxy.server.apiSchema;
    };
    assets: {
        create: typeof serverProxy.assets.create;
    };
    users: {
        get: typeof serverProxy.users.get;
    };
    jobs: {
        get: (filter: {
            page?: number;
            filter?: string;
            sort?: string;
            search?: string;
            jobID?: number;
            taskID?: number;
            type?: string;
        }, aggregate?: boolean) => Promise<PaginatedResource<Job>>;
    };
    tasks: {
        get: (filter: {
            page?: number;
            pageSize?: number;
            projectId?: number;
            id?: number;
            sort?: string;
            search?: string;
            filter?: string;
            ordering?: string;
        }, aggregate?: boolean) => Promise<PaginatedResource<Task>>;
    }
    projects: {
        get: (
            filter: {
                id?: number;
                page?: number;
                pageSize?: number;
                search?: string;
                sort?: string;
                filter?: string;
            }
        ) => Promise<PaginatedResource<Project>>;
        searchNames: typeof serverProxy.projects.searchNames;
    };
    cloudStorages: {
        get: typeof serverProxy.cloudStorages.get;
    };
    organizations: {
        get: typeof serverProxy.organizations.get;
        activate: (organization: Organization) => void;
        deactivate: () => void;
        acceptInvitation: (key: string) => Promise<string>;
        declineInvitation: (key: string) => Promise<void>;
        invitations: (filter: {
            page?: number,
            filter?: string,
        }) => Promise<Invitation[] & { count: number }>;
    };
    webhooks: {
        get: typeof serverProxy.webhooks.get;
    };
    consensus: {
        settings: {
            get: (filter: ConsensusSettingsFilter) => Promise<ConsensusSettings>;
        };
    }
    analytics: {
        quality: {
            reports: (filter: QualityReportsFilter, aggregate?: boolean) => Promise<PaginatedResource<QualityReport>>;
            conflicts: (filter: QualityConflictsFilter) => Promise<QualityConflict[]>;
            settings: {
                get: (
                    filter: QualitySettingsFilter,
                    aggregate?: boolean,
                ) => Promise<PaginatedResource<QualitySettings>>;
            };
        };
        events: {
            export: (filter: AnalyticsEventsFilter) => Promise<string>;
        };
    };
    frames: {
        getMeta: typeof serverProxy.frames.getMeta;
    };
    requests: {
        list: () => Promise<PaginatedResource<Request>>;
        listen: (
            rqID: string,
            options: {
                callback: (request: Request) => void,
                initialRequest?: Request,
            }
        ) => Promise<Request>;
        cancel: (rqID: string) => Promise<void>;
    };
    actions: {
        list: typeof listActions;
        register: typeof registerAction;
        unregister: typeof unregisterAction;
        run: typeof runAction;
        call: typeof callAction;
    };
    logger: typeof logger;
    config: {
        backendAPI: typeof config.backendAPI;
        origin: typeof config.origin;
        uploadChunkSize: typeof config.uploadChunkSize;
        removeUnderlyingMaskPixels: {
            enabled: boolean;
            onEmptyMaskOccurrence: () => void | null;
        };
        onOrganizationChange: (newOrgId: number | null) => void | null;
        globalObjectsCounter: typeof config.globalObjectsCounter;
        requestsStatusDelay: typeof config.requestsStatusDelay;
        jobMetaDataReloadPeriod: typeof config.jobMetaDataReloadPeriod;
    },
    enums,
    exceptions: {
        Exception: typeof Exception,
        ArgumentError: typeof ArgumentError,
        DataError: typeof DataError,
        ScriptingError: typeof ScriptingError,
        ServerError: typeof ServerError,
    },
    classes: {
        User: typeof User;
        Project: typeof Project;
        Task: typeof Task;
        Job: typeof Job;
        Event: typeof Event;
        Attribute: typeof Attribute;
        Label: typeof Label;
        Statistics: typeof Statistics;
        ObjectState: typeof ObjectState;
        MLModel: typeof MLModel;
        Comment: typeof Comment;
        Issue: typeof Issue;
        FrameData: typeof FrameData;
        CloudStorage: typeof CloudStorage;
        Organization: typeof Organization;
        Webhook: typeof Webhook;
        AnnotationGuide: typeof AnnotationGuide;
        BaseShapesAction: typeof BaseShapesAction;
        BaseCollectionAction: typeof BaseCollectionAction;
        QualityReport: typeof QualityReport;
        QualityConflict: typeof QualityConflict;
        QualitySettings: typeof QualitySettings;
        Request: typeof Request;
        FramesMetaData: typeof FramesMetaData;
        JobValidationLayout: typeof JobValidationLayout;
        TaskValidationLayout: typeof TaskValidationLayout;
    };
    utils: {
        mask2Rle: typeof mask2Rle;
        rle2Mask: typeof rle2Mask;
        propagateShapes: typeof propagateShapes;
        validateAttributeValue: typeof validateAttributeValue;
    };
}
