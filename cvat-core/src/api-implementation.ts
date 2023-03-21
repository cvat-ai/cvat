// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from './config';

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';
import lambdaManager from './lambda-manager';
import {
    isBoolean,
    isInteger,
    isString,
    checkFilter,
    checkExclusiveFields,
    checkObjectType,
} from './common';

import User from './user';
import { AnnotationFormats } from './annotation-formats';
import { Task, Job } from './session';
import Project from './project';
import CloudStorage from './cloud-storage';
import Organization from './organization';
import Webhook from './webhook';

export default function implementAPI(cvat) {
    cvat.plugins.list.implementation = PluginRegistry.list;
    cvat.plugins.register.implementation = PluginRegistry.register.bind(cvat);

    cvat.lambda.list.implementation = lambdaManager.list.bind(lambdaManager);
    cvat.lambda.run.implementation = lambdaManager.run.bind(lambdaManager);
    cvat.lambda.call.implementation = lambdaManager.call.bind(lambdaManager);
    cvat.lambda.cancel.implementation = lambdaManager.cancel.bind(lambdaManager);
    cvat.lambda.listen.implementation = lambdaManager.listen.bind(lambdaManager);
    cvat.lambda.requests.implementation = lambdaManager.requests.bind(lambdaManager);
    cvat.lambda.providers.implementation = lambdaManager.providers.bind(lambdaManager);

    cvat.server.about.implementation = async () => {
        const result = await serverProxy.server.about();
        return result;
    };

    cvat.server.share.implementation = async (directory) => {
        const result = await serverProxy.server.share(directory);
        return result;
    };

    cvat.server.formats.implementation = async () => {
        const result = await serverProxy.server.formats();
        return new AnnotationFormats(result);
    };

    cvat.server.userAgreements.implementation = async () => {
        const result = await serverProxy.server.userAgreements();
        return result;
    };

    cvat.server.register.implementation = async (
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
    };

    cvat.server.login.implementation = async (username, password) => {
        await serverProxy.server.login(username, password);
    };

    cvat.server.logout.implementation = async () => {
        await serverProxy.server.logout();
    };

    cvat.server.changePassword.implementation = async (oldPassword, newPassword1, newPassword2) => {
        await serverProxy.server.changePassword(oldPassword, newPassword1, newPassword2);
    };

    cvat.server.requestPasswordReset.implementation = async (email) => {
        await serverProxy.server.requestPasswordReset(email);
    };

    cvat.server.resetPassword.implementation = async (newPassword1, newPassword2, uid, token) => {
        await serverProxy.server.resetPassword(newPassword1, newPassword2, uid, token);
    };

    cvat.server.authorized.implementation = async () => {
        const result = await serverProxy.server.authorized();
        return result;
    };

    cvat.server.healthCheck.implementation = async (
        maxRetries = 1,
        checkPeriod = 3000,
        requestTimeout = 5000,
        progressCallback = undefined,
    ) => {
        const result = await serverProxy.server.healthCheck(maxRetries, checkPeriod, requestTimeout, progressCallback);
        return result;
    };

    cvat.server.request.implementation = async (url, data) => {
        const result = await serverProxy.server.request(url, data);
        return result;
    };

    cvat.server.setAuthData.implementation = async (response) => {
        const result = await serverProxy.server.setAuthData(response);
        return result;
    };

    cvat.server.removeAuthData.implementation = async () => {
        const result = await serverProxy.server.removeAuthData();
        return result;
    };

    cvat.server.installedApps.implementation = async () => {
        const result = await serverProxy.server.installedApps();
        return result;
    };

    cvat.users.get.implementation = async (filter) => {
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
    };

    cvat.jobs.get.implementation = async (query) => {
        checkFilter(query, {
            page: isInteger,
            filter: isString,
            sort: isString,
            search: isString,
            jobID: isInteger,
        });

        checkExclusiveFields(query, ['jobID', 'filter', 'search'], ['page', 'sort']);
        if ('jobID' in query) {
            const { results } = await serverProxy.jobs.get({ id: query.jobID });
            const [job] = results;
            if (job) {
                // When request job by ID we also need to add labels to work with them
                const labels = await serverProxy.labels.get({ job_id: job.id });
                return [new Job({ ...job, labels: labels.results })];
            }

            return [];
        }

        const searchParams = {};
        for (const key of Object.keys(query)) {
            if (['page', 'sort', 'search', 'filter', 'task_id'].includes(key)) {
                searchParams[key] = query[key];
            }
        }

        const jobsData = await serverProxy.jobs.get(searchParams);
        const jobs = jobsData.results.map((jobData) => new Job(jobData));
        jobs.count = jobsData.count;
        return jobs;
    };

    cvat.tasks.get.implementation = async (filter) => {
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
                    ...taskItem, progress: taskItem.jobs, jobs: jobs.results, labels: labels.results,
                });
            }

            return new Task({
                ...taskItem,
                progress: taskItem.jobs,
            });
        }));

        tasks.count = tasksData.count;
        return tasks;
    };

    cvat.projects.get.implementation = async (filter) => {
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

            return new Project({
                ...projectItem,
            });
        }));

        projects.count = projectsData.count;
        return projects;
    };

    cvat.projects.searchNames
        .implementation = async (search, limit) => serverProxy.projects.searchNames(search, limit);

    cvat.cloudStorages.get.implementation = async (filter) => {
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
        cloudStorages.count = cloudStoragesData.count;
        return cloudStorages;
    };

    cvat.organizations.get.implementation = async () => {
        const organizationsData = await serverProxy.organizations.get();
        const organizations = organizationsData.map((organizationData) => new Organization(organizationData));
        return organizations;
    };

    cvat.organizations.activate.implementation = (organization) => {
        checkObjectType('organization', organization, null, Organization);
        config.organizationID = organization.slug;
    };

    cvat.organizations.deactivate.implementation = async () => {
        config.organizationID = null;
    };

    cvat.webhooks.get.implementation = async (filter) => {
        checkFilter(filter, {
            page: isInteger,
            id: isInteger,
            projectId: isInteger,
            filter: isString,
            search: isString,
            sort: isString,
        });

        checkExclusiveFields(filter, ['id', 'projectId'], ['page']);
        const searchParams = {};
        for (const key of Object.keys(filter)) {
            if (['page', 'id', 'filter', 'search', 'sort'].includes(key)) {
                searchParams[key] = filter[key];
            }
        }

        if (filter.projectId) {
            if (searchParams.filter) {
                const parsed = JSON.parse(searchParams.filter);
                searchParams.filter = JSON.stringify({ and: [parsed, { '==': [{ var: 'project_id' }, filter.projectId] }] });
            } else {
                searchParams.filter = JSON.stringify({ and: [{ '==': [{ var: 'project_id' }, filter.projectId] }] });
            }
        }

        const webhooksData = await serverProxy.webhooks.get(searchParams);
        const webhooks = webhooksData.map((webhookData) => new Webhook(webhookData));
        webhooks.count = webhooksData.count;
        return webhooks;
    };

    return cvat;
}
