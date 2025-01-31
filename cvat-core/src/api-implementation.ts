// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
import config from './config';

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import lambdaManager from './lambda-manager';
import requestsManager from './requests-manager';
import {
    isBoolean,
    isInteger,
    isString,
    isPageSize,
    checkFilter,
    checkExclusiveFields,
    checkObjectType,
    filterFieldsToSnakeCase,
    fieldsToSnakeCase,
} from './common';

import User from './user';
import { AnnotationFormats } from './annotation-formats';
import { Task, Job } from './session';
import Project from './project';
import CloudStorage from './cloud-storage';
import Organization, { Invitation } from './organization';
import Webhook from './webhook';
import { ArgumentError } from './exceptions';
import {
    AnalyticsReportFilter, QualityConflictsFilter, QualityReportsFilter,
    QualitySettingsFilter, SerializedAsset,
} from './server-response-types';
import QualityReport from './quality-report';
import QualityConflict, { ConflictSeverity } from './quality-conflict';
import QualitySettings from './quality-settings';
import { getFramesMeta } from './frames';
import AnalyticsReport from './analytics-report';
import {
    callAction, listActions, registerAction, runAction,
} from './annotations-actions/annotations-actions';
import { convertDescriptions, getServerAPISchema } from './server-schema';
import { JobType } from './enums';
import { PaginatedResource } from './core-types';
import CVATCore from '.';

function implementationMixin(func: Function, implementation: Function): void {
    Object.assign(func, { implementation });
}

export default function implementAPI(cvat: CVATCore): CVATCore {
    implementationMixin(cvat.plugins.list, PluginRegistry.list);
    implementationMixin(cvat.plugins.register, PluginRegistry.register.bind(cvat));
    implementationMixin(cvat.actions.list, listActions);
    implementationMixin(cvat.actions.register, registerAction);
    implementationMixin(cvat.actions.run, runAction);
    implementationMixin(cvat.actions.call, callAction);

    implementationMixin(cvat.lambda.list, lambdaManager.list.bind(lambdaManager));
    implementationMixin(cvat.lambda.run, lambdaManager.run.bind(lambdaManager));
    implementationMixin(cvat.lambda.call, lambdaManager.call.bind(lambdaManager));
    implementationMixin(cvat.lambda.cancel, lambdaManager.cancel.bind(lambdaManager));
    implementationMixin(cvat.lambda.listen, lambdaManager.listen.bind(lambdaManager));
    implementationMixin(cvat.lambda.requests, lambdaManager.requests.bind(lambdaManager));

    implementationMixin(cvat.requests.list, requestsManager.list.bind(requestsManager));
    implementationMixin(cvat.requests.listen, requestsManager.listen.bind(requestsManager));
    implementationMixin(cvat.requests.cancel, requestsManager.cancel.bind(requestsManager));

    implementationMixin(cvat.server.about, async () => {
        const result = await serverProxy.server.about();
        return result;
    });
    implementationMixin(cvat.server.share, async (directory: string, searchPrefix?: string) => {
        const result = await serverProxy.server.share(directory, searchPrefix);
        return result.map((item) => ({ ...omit(item, 'mime_type'), mimeType: item.mime_type }));
    });
    implementationMixin(cvat.server.formats, async () => {
        const result = await serverProxy.server.formats();
        return new AnnotationFormats(result);
    });
    implementationMixin(cvat.server.userAgreements, async () => {
        const result = await serverProxy.server.userAgreements();
        return result;
    });
    implementationMixin(cvat.server.register, async (
        username,
        firstName,
        lastName,
        email,
        password,
        userConfirmations,
    ) => {
        const user = await serverProxy.server.register(
            username,
            firstName,
            lastName,
            email,
            password,
            userConfirmations,
        );

        return new User(user);
    });
    implementationMixin(cvat.server.login, async (username, password) => {
        await serverProxy.server.login(username, password);
    });
    implementationMixin(cvat.server.logout, async () => {
        await serverProxy.server.logout();
    });
    implementationMixin(cvat.server.changePassword, async (oldPassword, newPassword1, newPassword2) => {
        await serverProxy.server.changePassword(oldPassword, newPassword1, newPassword2);
    });
    implementationMixin(cvat.server.requestPasswordReset, async (email) => {
        await serverProxy.server.requestPasswordReset(email);
    });
    implementationMixin(cvat.server.resetPassword, async (newPassword1, newPassword2, uid, token) => {
        await serverProxy.server.resetPassword(newPassword1, newPassword2, uid, token);
    });
    implementationMixin(cvat.server.authenticated, async () => {
        const result = await serverProxy.server.authenticated();
        return result;
    });
    implementationMixin(cvat.server.healthCheck, async (
        maxRetries: number,
        checkPeriod: number,
        requestTimeout: number,
        progressCallback?: (message: string) => void,
    ) => {
        const result = await serverProxy.server.healthCheck(maxRetries, checkPeriod, requestTimeout, progressCallback);
        return result;
    });
    implementationMixin(cvat.server.request, async (url, data, requestConfig) => {
        const result = await serverProxy.server.request(url, data, requestConfig);
        return result;
    });
    implementationMixin(cvat.server.setAuthData, async (response) => {
        const result = await serverProxy.server.setAuthData(response);
        return result;
    });
    implementationMixin(cvat.server.installedApps, async () => {
        const result = await serverProxy.server.installedApps();
        return result;
    });

    implementationMixin(cvat.server.apiSchema, async () => {
        const result = await getServerAPISchema();
        return result;
    });

    implementationMixin(cvat.assets.create, async (file: File, guideId: number): Promise<SerializedAsset> => {
        if (!(file instanceof File)) {
            throw new ArgumentError('Assets expect a file');
        }

        const result = await serverProxy.assets.create(file, guideId);
        return result;
    });

    implementationMixin(cvat.users.get, async (filter) => {
        checkFilter(filter, {
            id: isInteger,
            is_active: isBoolean,
            self: isBoolean,
            search: isString,
            limit: isInteger,
        });

        let users = null;
        if ('self' in filter && filter.self) {
            users = await serverProxy.users.self();
            users = [users];
        } else {
            const searchParams = {};
            for (const key in filter) {
                if (filter[key] && key !== 'self') {
                    searchParams[key] = filter[key];
                }
            }
            users = await serverProxy.users.get(searchParams);
        }

        users = users.map((user) => new User(user));
        return users;
    });

    implementationMixin(cvat.jobs.get, async (
        query: Parameters<CVATCore['jobs']['get']>[0],
    ): ReturnType<CVATCore['jobs']['get']> => {
        checkFilter(query, {
            page: isInteger,
            filter: isString,
            sort: isString,
            search: isString,
            jobID: isInteger,
            taskID: isInteger,
            type: isString,
        });

        checkExclusiveFields(query, ['jobID', 'filter', 'search'], ['page', 'sort']);
        if ('jobID' in query) {
            const results = await serverProxy.jobs.get({ id: query.jobID });
            const [job] = results;
            if (job) {
                // When request job by ID we also need to add labels to work with them
                const labels = await serverProxy.labels.get({ job_id: job.id });
                return Object.assign([new Job({ ...job, labels: labels.results })], { count: 1 });
            }

            return Object.assign([], { count: 0 });
        }

        const searchParams: Record<string, string> = {};

        for (const key of Object.keys(query)) {
            if (['page', 'sort', 'search', 'filter', 'type'].includes(key)) {
                searchParams[key] = query[key];
            }
        }
        if ('taskID' in query) {
            searchParams.task_id = `${query.taskID}`;
        }

        const jobsData = await serverProxy.jobs.get(searchParams);
        if (query.type === JobType.GROUND_TRUTH && jobsData.count === 1) {
            const labels = await serverProxy.labels.get({ job_id: jobsData[0].id });
            return Object.assign([
                new Job({
                    ...omit(jobsData[0], 'labels'),
                    labels: labels.results,
                }),
            ], { count: 1 });
        }

        const jobs = jobsData.map((jobData) => new Job(omit(jobData, 'labels')));
        return Object.assign(jobs, { count: jobsData.count });
    });

    implementationMixin(cvat.tasks.get, async (
        filter: Parameters<CVATCore['tasks']['get']>[0],
    ): ReturnType<CVATCore['tasks']['get']> => {
        checkFilter(filter, {
            page: isInteger,
            projectId: isInteger,
            id: isInteger,
            sort: isString,
            search: isString,
            filter: isString,
            ordering: isString,
        });

        checkExclusiveFields(filter, ['id'], ['page']);
        const searchParams = {};
        for (const key of Object.keys(filter)) {
            if (['page', 'id', 'sort', 'search', 'filter', 'ordering'].includes(key)) {
                searchParams[key] = filter[key];
            }
        }

        if ('projectId' in filter) {
            if (searchParams.filter) {
                const parsed = JSON.parse(searchParams.filter);
                searchParams.filter = JSON.stringify({ and: [parsed, { '==': [{ var: 'project_id' }, filter.projectId] }] });
            } else {
                searchParams.filter = JSON.stringify({ and: [{ '==': [{ var: 'project_id' }, filter.projectId] }] });
            }
        }

        const tasksData = await serverProxy.tasks.get(searchParams);
        const tasks = await Promise.all(tasksData.map(async (taskItem) => {
            if ('id' in filter) {
                // When request task by ID we also need to add labels and jobs to work with them
                const labels = await serverProxy.labels.get({ task_id: taskItem.id });
                const jobs = await serverProxy.jobs.get({ task_id: taskItem.id }, true);
                return new Task({
                    ...omit(taskItem, ['jobs', 'labels']),
                    progress: taskItem.jobs,
                    jobs,
                    labels: labels.results,
                });
            }

            return new Task({
                ...omit(taskItem, ['jobs', 'labels']),
                progress: taskItem.jobs,
            });
        }));

        Object.assign(tasks, { count: tasksData.count });
        return tasks as PaginatedResource<Task>;
    });

    implementationMixin(cvat.projects.get, async (
        filter: Parameters<CVATCore['projects']['get']>[0],
    ): ReturnType<CVATCore['projects']['get']> => {
        checkFilter(filter, {
            id: isInteger,
            page: isInteger,
            search: isString,
            sort: isString,
            filter: isString,
        });

        checkExclusiveFields(filter, ['id'], ['page']);
        const searchParams = {};
        for (const key of Object.keys(filter)) {
            if (['page', 'id', 'sort', 'search', 'filter'].includes(key)) {
                searchParams[key] = filter[key];
            }
        }

        const projectsData = await serverProxy.projects.get(searchParams);
        const projects = await Promise.all(projectsData.map(async (projectItem) => {
            if ('id' in filter) {
                // When request a project by ID we also need to add labels to work with them
                const labels = await serverProxy.labels.get({ project_id: projectItem.id });
                return new Project({ ...projectItem, labels: labels.results });
            }

            return new Project({ ...projectItem });
        }));

        return Object.assign(projects, { count: projectsData.count });
    });

    implementationMixin(cvat.projects.searchNames,
        async (search, limit) => serverProxy.projects.searchNames(search, limit));

    implementationMixin(cvat.cloudStorages.get, async (filter) => {
        checkFilter(filter, {
            page: isInteger,
            filter: isString,
            sort: isString,
            id: isInteger,
            search: isString,
        });

        checkExclusiveFields(filter, ['id', 'search'], ['page']);
        const searchParams = {};
        for (const key of Object.keys(filter)) {
            if (['page', 'filter', 'sort', 'id', 'search'].includes(key)) {
                searchParams[key] = filter[key];
            }
        }
        const cloudStoragesData = await serverProxy.cloudStorages.get(searchParams);
        const cloudStorages = cloudStoragesData.map((cloudStorage) => new CloudStorage(cloudStorage));
        Object.assign(cloudStorages, { count: cloudStoragesData.count });
        return cloudStorages;
    });

    implementationMixin(cvat.organizations.get, async (filter) => {
        checkFilter(filter, {
            search: isString,
            filter: isString,
        });

        const organizationsData = await serverProxy.organizations.get(filter);
        const organizations = organizationsData.map((organizationData) => new Organization(organizationData));
        return organizations;
    });
    implementationMixin(cvat.organizations.activate, (organization) => {
        checkObjectType('organization', organization, null, Organization);
        config.organization = {
            organizationID: organization.id,
            organizationSlug: organization.slug,
        };
    });
    implementationMixin(cvat.organizations.deactivate, async () => {
        config.organization = {
            organizationID: null,
            organizationSlug: null,
        };
    });
    implementationMixin(
        cvat.organizations.acceptInvitation,
        serverProxy.organizations.acceptInvitation,
    );
    implementationMixin(
        cvat.organizations.declineInvitation,
        serverProxy.organizations.declineInvitation,
    );
    implementationMixin(cvat.organizations.invitations, (async (filter) => {
        checkFilter(filter, {
            page: isInteger,
            filter: isString,
        });
        checkExclusiveFields(filter, ['filter'], ['page']);

        const invitationsData = await serverProxy.organizations.invitations(filter);
        const invitations = invitationsData.results.map((invitationData) => new Invitation({ ...invitationData }));
        return Object.assign(invitations, { count: invitationsData.count });
    }) as typeof cvat.organizations.invitations);

    implementationMixin(cvat.webhooks.get, async (filter) => {
        checkFilter(filter, {
            page: isInteger,
            id: isInteger,
            projectId: isInteger,
            filter: isString,
            search: isString,
            sort: isString,
        });

        checkExclusiveFields(filter, ['id', 'projectId'], ['page']);

        const searchParams = filterFieldsToSnakeCase(filter, ['projectId']);

        const webhooksData = await serverProxy.webhooks.get(searchParams);
        const webhooks = webhooksData.map((webhookData) => new Webhook(webhookData));
        Object.assign(webhooks, { count: webhooksData.count });
        return webhooks;
    });

    implementationMixin(cvat.analytics.quality.reports, async (filter: QualityReportsFilter) => {
        checkFilter(filter, {
            page: isInteger,
            pageSize: isPageSize,
            parentID: isInteger,
            projectID: isInteger,
            taskID: isInteger,
            jobID: isInteger,
            target: isString,
            filter: isString,
            search: isString,
            sort: isString,
        });

        const params = fieldsToSnakeCase({ ...filter, sort: '-created_date' });

        const reportsData = await serverProxy.analytics.quality.reports(params);
        const reports = Object.assign(
            reportsData.map((report) => new QualityReport({ ...report })),
            { count: reportsData.count },
        );
        return reports;
    });
    implementationMixin(cvat.analytics.quality.conflicts, async (filter: QualityConflictsFilter) => {
        checkFilter(filter, {
            reportID: isInteger,
        });

        const params = fieldsToSnakeCase(filter);

        const conflictsData = await serverProxy.analytics.quality.conflicts(params);
        const conflicts = conflictsData.map((conflict) => new QualityConflict({ ...conflict }));
        const frames = Array.from(new Set(conflicts.map((conflict) => conflict.frame)))
            .sort((a, b) => a - b);

        // each QualityConflict may have several AnnotationConflicts bound
        // at the same time, many quality conflicts may refer
        // to the same labeled object (e.g. mismatch label, low overlap)
        // the code below unites quality conflicts bound to the same object into one QualityConflict object
        const mergedConflicts: QualityConflict[] = [];

        for (const frame of frames) {
            const frameConflicts = conflicts.filter((conflict) => conflict.frame === frame);
            const conflictsByObject: Record<string, QualityConflict[]> = {};

            frameConflicts.forEach((qualityConflict: QualityConflict) => {
                const { type, serverID } = qualityConflict.annotationConflicts[0];
                const firstObjID = `${type}_${serverID}`;
                conflictsByObject[firstObjID] = conflictsByObject[firstObjID] || [];
                conflictsByObject[firstObjID].push(qualityConflict);
            });

            for (const objectConflicts of Object.values(conflictsByObject)) {
                if (objectConflicts.length === 1) {
                    // only one quality conflict refers to the object on current frame
                    mergedConflicts.push(objectConflicts[0]);
                } else {
                    const mainObjectConflict = objectConflicts
                        .find((conflict) => conflict.severity === ConflictSeverity.ERROR) || objectConflicts[0];
                    const descriptionList: string[] = [mainObjectConflict.description];

                    for (const objectConflict of objectConflicts) {
                        if (objectConflict !== mainObjectConflict) {
                            descriptionList.push(objectConflict.description);

                            for (const annotationConflict of objectConflict.annotationConflicts) {
                                if (!mainObjectConflict.annotationConflicts.find((_annotationConflict) => (
                                    _annotationConflict.serverID === annotationConflict.serverID &&
                                    _annotationConflict.type === annotationConflict.type))
                                ) {
                                    mainObjectConflict.annotationConflicts.push(annotationConflict);
                                }
                            }
                        }
                    }

                    // decorate the original conflict to avoid changing it
                    const description = descriptionList.join(', ');
                    const visibleConflict = new Proxy(mainObjectConflict, {
                        get(target, prop) {
                            if (prop === 'description') {
                                return description;
                            }

                            // By default, it looks like Reflect.get(target, prop, receiver)
                            // which has a different value of `this`. It doesn't allow to
                            // work with methods / properties that use private members.
                            const val = Reflect.get(target, prop);
                            return typeof val === 'function' ? (...args: any[]) => val.apply(target, args) : val;
                        },
                    });

                    mergedConflicts.push(visibleConflict);
                }
            }
        }

        return mergedConflicts;
    });
    implementationMixin(cvat.analytics.quality.settings.get, async (filter: QualitySettingsFilter) => {
        checkFilter(filter, {
            taskID: isInteger,
        });

        const params = fieldsToSnakeCase(filter);

        const settings = await serverProxy.analytics.quality.settings.get(params);
        const schema = await getServerAPISchema();
        const descriptions = convertDescriptions(schema.components.schemas.QualitySettings.properties);

        return new QualitySettings({ ...settings, descriptions });
    });
    implementationMixin(cvat.analytics.performance.reports, async (filter: AnalyticsReportFilter) => {
        checkFilter(filter, {
            jobID: isInteger,
            taskID: isInteger,
            projectID: isInteger,
            startDate: isString,
            endDate: isString,
        });

        checkExclusiveFields(filter, ['jobID', 'taskID', 'projectID'], ['startDate', 'endDate']);

        const params = fieldsToSnakeCase(filter);
        const reportData = await serverProxy.analytics.performance.reports(params);
        return new AnalyticsReport(reportData);
    });
    implementationMixin(cvat.analytics.performance.calculate, async (
        body: Parameters<CVATCore['analytics']['performance']['calculate']>[0],
        onUpdate: Parameters<CVATCore['analytics']['performance']['calculate']>[1],
    ) => {
        checkFilter(body, {
            jobID: isInteger,
            taskID: isInteger,
            projectID: isInteger,
        });

        checkExclusiveFields(body, ['jobID', 'taskID', 'projectID'], []);
        if (!('jobID' in body || 'taskID' in body || 'projectID' in body)) {
            throw new ArgumentError('One of "jobID", "taskID", "projectID" is required, but not provided');
        }

        const params = fieldsToSnakeCase(body);
        await serverProxy.analytics.performance.calculate(params, onUpdate);
    });
    implementationMixin(cvat.frames.getMeta, async (type: 'job' | 'task', id: number) => {
        const result = await getFramesMeta(type, id);
        return result;
    });

    return cvat;
}
