// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    AnalyticsReportFilter, QualityConflictsFilter, QualityReportsFilter, QualitySettingsFilter,
} from './server-response-types';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import lambdaManager from './lambda-manager';
import { AnnotationFormats } from './annotation-formats';
import logger from './logger';
import * as enums from './enums';
import config from './config';
import { mask2Rle, rle2Mask } from './object-utils';
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
import { FrameData } from './frames';
import CloudStorage from './cloud-storage';
import Organization, { Invitation } from './organization';
import Webhook from './webhook';
import QualityReport from './quality-report';
import QualityConflict from './quality-conflict';
import QualitySettings from './quality-settings';
import AnalyticsReport from './analytics-report';
import AnnotationGuide from './guide';
import BaseSingleFrameAction, { listActions, registerAction, runActions } from './annotations-actions';
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
        about: typeof serverProxy.server.about;
        share: (dir: string) => Promise<{
            mimeType: string;
            name: string;
            type: enums.ShareFileType;
        }[]>;
        formats: () => Promise<AnnotationFormats>;
        userAgreements: typeof serverProxy.server.userAgreements,
        register: any; // TODO: add types later
        login: any;
        logout: any;
        changePassword: any;
        requestPasswordReset: any;
        resetPassword: any;
        authenticated: any;
        healthCheck: any;
        request: any;
        setAuthData: any;
        removeAuthData: any;
        installedApps: any;
        apiSchema: typeof serverProxy.server.apiSchema;
    };
    assets: {
        create: any;
    };
    users: {
        get: any;
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
        }) => Promise<PaginatedResource<Job>>;
    };
    tasks: {
        get: (filter: {
            page?: number;
            projectId?: number;
            id?: number;
            sort?: string;
            search?: string;
            filter?: string;
            ordering?: string;
        }) => Promise<PaginatedResource<Task>>;
    }
    projects: {
        get: (
            filter: {
                id?: number;
                page?: number;
                search?: string;
                sort?: string;
                filter?: string;
            }
        ) => Promise<PaginatedResource<Project>>;
        searchNames: any;
    };
    cloudStorages: {
        get: any;
    };
    organizations: {
        get: any;
        activate: any;
        deactivate: any;
        acceptInvitation: (key: string) => Promise<string>;
        declineInvitation: (key: string) => Promise<void>;
        invitations: (filter: {
            page?: number,
            filter?: string,
        }) => Promise<Invitation[] & { count: number }>;
    };
    webhooks: {
        get: any;
    };
    analytics: {
        quality: {
            reports: (filter: QualityReportsFilter) => Promise<PaginatedResource<QualityReport>>;
            conflicts: (filter: QualityConflictsFilter) => Promise<QualityConflict[]>;
            settings: {
                get: (filter: QualitySettingsFilter) => Promise<QualitySettings>;
            };
        };
        performance: {
            reports: (filter: AnalyticsReportFilter) => Promise<AnalyticsReport>;
            calculate: (
                body: { jobID?: number; taskID?: number; projectID?: number; },
                onUpdate: (status: enums.RQStatus, progress: number, message: string) => void,
            ) => Promise<void>;
        };
    };
    frames: {
        getMeta: any;
    };
    actions: {
        list: typeof listActions;
        register: typeof registerAction;
        run: typeof runActions;
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
    },
    client: {
        version: string;
    };
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
        BaseSingleFrameAction: typeof BaseSingleFrameAction;
    };
    utils: {
        mask2Rle: typeof mask2Rle;
        rle2Mask: typeof rle2Mask;
    };
}
