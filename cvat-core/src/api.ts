// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * External API which should be used by for development
 * @module API
 */

import PluginRegistry from './plugins';
import loggerStorage from './logger-storage';
import { EventLogger } from './log';
import ObjectState from './object-state';
import Statistics from './statistics';
import Comment from './comment';
import Issue from './issue';
import { Job, Task } from './session';
import { implementJob, implementTask } from './session-implementation';
import Project from './project';
import implementProject from './project-implementation';
import { Attribute, Label } from './labels';
import MLModel from './ml-model';
import { FrameData } from './frames';
import CloudStorage from './cloud-storage';
import Organization from './organization';
import Webhook from './webhook';

import * as enums from './enums';

import {
    Exception, ArgumentError, DataError, ScriptingError, PluginError, ServerError,
} from './exceptions';

import User from './user';
import pjson from '../package.json';
import config from './config';

import implementAPI from './api-implementation';

function build() {
    const cvat = {
        server: {
            async about() {
                const result = await PluginRegistry.apiWrapper(cvat.server.about);
                return result;
            },
            async share(directory = '/') {
                const result = await PluginRegistry.apiWrapper(cvat.server.share, directory);
                return result;
            },
            async formats() {
                const result = await PluginRegistry.apiWrapper(cvat.server.formats);
                return result;
            },
            async userAgreements() {
                const result = await PluginRegistry.apiWrapper(cvat.server.userAgreements);
                return result;
            },
            async register(username, firstName, lastName, email, password, userConfirmations) {
                const result = await PluginRegistry.apiWrapper(
                    cvat.server.register,
                    username,
                    firstName,
                    lastName,
                    email,
                    password,
                    userConfirmations,
                );
                return result;
            },
            async login(username, password) {
                const result = await PluginRegistry.apiWrapper(cvat.server.login, username, password);
                return result;
            },
            async logout() {
                const result = await PluginRegistry.apiWrapper(cvat.server.logout);
                return result;
            },
            async changePassword(oldPassword, newPassword1, newPassword2) {
                const result = await PluginRegistry.apiWrapper(
                    cvat.server.changePassword,
                    oldPassword,
                    newPassword1,
                    newPassword2,
                );
                return result;
            },
            async requestPasswordReset(email) {
                const result = await PluginRegistry.apiWrapper(cvat.server.requestPasswordReset, email);
                return result;
            },
            async resetPassword(newPassword1, newPassword2, uid, token) {
                const result = await PluginRegistry.apiWrapper(
                    cvat.server.resetPassword,
                    newPassword1,
                    newPassword2,
                    uid,
                    token,
                );
                return result;
            },
            async authorized() {
                const result = await PluginRegistry.apiWrapper(cvat.server.authorized);
                return result;
            },
            async healthCheck(maxRetries = 1, checkPeriod = 3000, requestTimeout = 5000, progressCallback = undefined) {
                const result = await PluginRegistry.apiWrapper(
                    cvat.server.healthCheck,
                    maxRetries,
                    checkPeriod,
                    requestTimeout,
                    progressCallback,
                );
                return result;
            },
            async request(url, data) {
                const result = await PluginRegistry.apiWrapper(cvat.server.request, url, data);
                return result;
            },
            async setAuthData(response) {
                const result = await PluginRegistry.apiWrapper(cvat.server.setAuthData, response);
                return result;
            },
            async removeAuthData() {
                const result = await PluginRegistry.apiWrapper(cvat.server.removeAuthData);
                return result;
            },
            async installedApps() {
                const result = await PluginRegistry.apiWrapper(cvat.server.installedApps);
                return result;
            },
        },
        projects: {
            async get(filter = {}) {
                const result = await PluginRegistry.apiWrapper(cvat.projects.get, filter);
                return result;
            },
            async searchNames(search = '', limit = 10) {
                const result = await PluginRegistry.apiWrapper(cvat.projects.searchNames, search, limit);
                return result;
            },
        },
        tasks: {
            async get(filter = {}) {
                const result = await PluginRegistry.apiWrapper(cvat.tasks.get, filter);
                return result;
            },
        },
        jobs: {
            async get(filter = {}) {
                const result = await PluginRegistry.apiWrapper(cvat.jobs.get, filter);
                return result;
            },
        },
        users: {
            async get(filter = {}) {
                const result = await PluginRegistry.apiWrapper(cvat.users.get, filter);
                return result;
            },
        },
        plugins: {
            async list() {
                const result = await PluginRegistry.apiWrapper(cvat.plugins.list);
                return result;
            },
            async register(plugin) {
                const result = await PluginRegistry.apiWrapper(cvat.plugins.register, plugin);
                return result;
            },
        },
        lambda: {
            async list() {
                const result = await PluginRegistry.apiWrapper(cvat.lambda.list);
                return result;
            },
            async run(task, model, args) {
                const result = await PluginRegistry.apiWrapper(cvat.lambda.run, task, model, args);
                return result;
            },
            async call(task, model, args) {
                const result = await PluginRegistry.apiWrapper(cvat.lambda.call, task, model, args);
                return result;
            },
            async cancel(requestID, functionID) {
                const result = await PluginRegistry.apiWrapper(cvat.lambda.cancel, requestID, functionID);
                return result;
            },
            async listen(requestID, functionID, onChange) {
                const result = await PluginRegistry.apiWrapper(cvat.lambda.listen, requestID, functionID, onChange);
                return result;
            },
            async requests() {
                const result = await PluginRegistry.apiWrapper(cvat.lambda.requests);
                return result;
            },
            async providers() {
                const result = await PluginRegistry.apiWrapper(cvat.lambda.providers);
                return result;
            },
        },
        logger: loggerStorage,
        config: {
            get backendAPI() {
                return config.backendAPI;
            },
            set backendAPI(value) {
                config.backendAPI = value;
            },
            get origin() {
                return config.origin;
            },
            set origin(value) {
                config.origin = value;
            },
            get uploadChunkSize() {
                return config.uploadChunkSize;
            },
            set uploadChunkSize(value) {
                config.uploadChunkSize = value;
            },
            get removeUnderlyingMaskPixels(): boolean {
                return config.removeUnderlyingMaskPixels;
            },
            set removeUnderlyingMaskPixels(value: boolean) {
                config.removeUnderlyingMaskPixels = value;
            },
        },
        client: {
            version: `${pjson.version}`,
        },
        enums,
        exceptions: {
            Exception,
            ArgumentError,
            DataError,
            ScriptingError,
            PluginError,
            ServerError,
        },
        cloudStorages: {
            async get(filter = {}) {
                const result = await PluginRegistry.apiWrapper(cvat.cloudStorages.get, filter);
                return result;
            },
        },
        organizations: {
            async get() {
                const result = await PluginRegistry.apiWrapper(cvat.organizations.get);
                return result;
            },
            async activate(organization) {
                const result = await PluginRegistry.apiWrapper(cvat.organizations.activate, organization);
                return result;
            },
            async deactivate() {
                const result = await PluginRegistry.apiWrapper(cvat.organizations.deactivate);
                return result;
            },
        },
        webhooks: {
            async get(filter: any) {
                const result = await PluginRegistry.apiWrapper(cvat.webhooks.get, filter);
                return result;
            },
        },
        classes: {
            User,
            Project: implementProject(Project),
            Task: implementTask(Task),
            Job: implementJob(Job),
            EventLogger,
            Attribute,
            Label,
            Statistics,
            ObjectState,
            MLModel,
            Comment,
            Issue,
            FrameData,
            CloudStorage,
            Organization,
            Webhook,
        },
    };

    cvat.server = Object.freeze(cvat.server);
    cvat.projects = Object.freeze(cvat.projects);
    cvat.tasks = Object.freeze(cvat.tasks);
    cvat.jobs = Object.freeze(cvat.jobs);
    cvat.users = Object.freeze(cvat.users);
    cvat.plugins = Object.freeze(cvat.plugins);
    cvat.lambda = Object.freeze(cvat.lambda);
    cvat.client = Object.freeze(cvat.client);
    cvat.enums = Object.freeze(cvat.enums);
    cvat.cloudStorages = Object.freeze(cvat.cloudStorages);
    cvat.organizations = Object.freeze(cvat.organizations);

    const implemented = Object.freeze(implementAPI(cvat));
    return implemented;
}

export default build();
