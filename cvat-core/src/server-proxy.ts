// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { StorageLocation, WebhookSourceType } from './enums';
import { Storage } from './storage';

type Params = {
    org: number | string,
    use_default_location?: boolean,
    location?: StorageLocation,
    cloud_storage_id?: number,
    format?: string,
    filename?: string,
    action?: string,
};

const FormData = require('form-data');
const store = require('store');
const Axios = require('axios');
const tus = require('tus-js-client');
const config = require('./config');
const DownloadWorker = require('./download.worker');
const { ServerError } = require('./exceptions');

function enableOrganization() {
    return { org: config.organizationID || '' };
}

function configureStorage(storage: Storage, useDefaultLocation = false): Partial<Params> {
    return {
        use_default_location: useDefaultLocation,
        ...(!useDefaultLocation ? {
            location: storage.location,
            ...(storage.cloudStorageId ? {
                cloud_storage_id: storage.cloudStorageId,
            } : {}),
        } : {}),
    };
}

function removeToken() {
    Axios.defaults.headers.common.Authorization = '';
    store.remove('token');
}

function waitFor(frequencyHz, predicate) {
    return new Promise<void>((resolve, reject) => {
        if (typeof predicate !== 'function') {
            reject(new Error(`Predicate must be a function, got ${typeof predicate}`));
        }

        const internalWait = () => {
            let result = false;
            try {
                result = predicate();
            } catch (error) {
                reject(error);
            }

            if (result) {
                resolve();
            } else {
                setTimeout(internalWait, 1000 / frequencyHz);
            }
        };

        setTimeout(internalWait);
    });
}

async function chunkUpload(file, uploadConfig) {
    const params = enableOrganization();
    const {
        endpoint, chunkSize, totalSize, onUpdate, metadata,
    } = uploadConfig;
    const { totalSentSize } = uploadConfig;
    const uploadResult = { totalSentSize };
    return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
            endpoint,
            metadata: {
                filename: file.name,
                filetype: file.type,
                ...metadata,
            },
            headers: {
                Authorization: Axios.defaults.headers.common.Authorization,
            },
            chunkSize,
            retryDelays: null,
            onError(error) {
                reject(error);
            },
            onBeforeRequest(req) {
                const xhr = req.getUnderlyingObject();
                const { org } = params;
                req.setHeader('X-Organization', org);
                xhr.withCredentials = true;
            },
            onProgress(bytesUploaded) {
                if (onUpdate && Number.isInteger(totalSentSize) && Number.isInteger(totalSize)) {
                    const currentUploadedSize = totalSentSize + bytesUploaded;
                    const percentage = currentUploadedSize / totalSize;
                    onUpdate(percentage);
                }
            },
            onAfterResponse(request, response) {
                const uploadFilename = response.getHeader('Upload-Filename');
                if (uploadFilename) uploadResult.filename = uploadFilename;
            },
            onSuccess() {
                if (totalSentSize) uploadResult.totalSentSize += file.size;
                resolve(uploadResult);
            },
        });
        upload.start();
    });
}

function generateError(errorData) {
    if (errorData.response) {
        const message = `${errorData.message}. ${JSON.stringify(errorData.response.data) || ''}.`;
        return new ServerError(message, errorData.response.status);
    }

    // Server is unavailable (no any response)
    const message = `${errorData.message}.`; // usually is "Error Network"
    return new ServerError(message, 0);
}

function prepareData(details) {
    const data = new FormData();
    for (const [key, value] of Object.entries(details)) {
        if (Array.isArray(value)) {
            value.forEach((element, idx) => {
                data.append(`${key}[${idx}]`, element);
            });
        } else {
            data.set(key, value);
        }
    }
    return data;
}

class WorkerWrappedAxios {
    constructor(requestInterseptor) {
        const worker = new DownloadWorker(requestInterseptor);
        const requests = {};
        let requestId = 0;

        worker.onmessage = (e) => {
            if (e.data.id in requests) {
                if (e.data.isSuccess) {
                    requests[e.data.id].resolve(e.data.responseData);
                } else {
                    requests[e.data.id].reject({
                        response: {
                            status: e.data.status,
                            data: e.data.responseData,
                        },
                    });
                }

                delete requests[e.data.id];
            }
        };

        worker.onerror = (e) => {
            if (e.data.id in requests) {
                requests[e.data.id].reject(e);
                delete requests[e.data.id];
            }
        };

        function getRequestId() {
            return requestId++;
        }

        async function get(url, requestConfig) {
            return new Promise((resolve, reject) => {
                const newRequestId = getRequestId();
                requests[newRequestId] = {
                    resolve,
                    reject,
                };
                worker.postMessage({
                    url,
                    config: requestConfig,
                    id: newRequestId,
                });
            });
        }

        Object.defineProperties(
            this,
            Object.freeze({
                get: {
                    value: get,
                    writable: false,
                },
            }),
        );
    }
}

class ServerProxy {
    constructor() {
        Axios.defaults.withCredentials = true;
        Axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        Axios.defaults.xsrfCookieName = 'csrftoken';
        const workerAxios = new WorkerWrappedAxios();
        Axios.interceptors.request.use((reqConfig) => {
            if ('params' in reqConfig && 'org' in reqConfig.params) {
                return reqConfig;
            }

            reqConfig.params = { ...enableOrganization(), ...(reqConfig.params || {}) };
            return reqConfig;
        });

        let token = store.get('token');
        if (token) {
            Axios.defaults.headers.common.Authorization = `Token ${token}`;
        }

        async function about() {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/server/about`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function share(directoryArg) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/server/share`, {
                    proxy: config.proxy,
                    params: { directory: directoryArg },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function exception(exceptionObject) {
            const { backendAPI } = config;

            try {
                await Axios.post(`${backendAPI}/server/exception`, JSON.stringify(exceptionObject), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function formats() {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/server/annotation/formats`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function userAgreements() {
            const { backendAPI } = config;
            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/restrictions/user-agreements`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function register(username, firstName, lastName, email, password1, password2, confirmations) {
            let response = null;
            try {
                const data = JSON.stringify({
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password1,
                    password2,
                    confirmations,
                });
                response = await Axios.post(`${config.backendAPI}/auth/register`, data, {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function login(username, password) {
            const authenticationData = [
                `${encodeURIComponent('username')}=${encodeURIComponent(username)}`,
                `${encodeURIComponent('password')}=${encodeURIComponent(password)}`,
            ]
                .join('&')
                .replace(/%20/g, '+');

            removeToken();
            let authenticationResponse = null;
            try {
                authenticationResponse = await Axios.post(`${config.backendAPI}/auth/login`, authenticationData, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            if (authenticationResponse.headers['set-cookie']) {
                // Browser itself setup cookie and header is none
                // In NodeJS we need do it manually
                const cookies = authenticationResponse.headers['set-cookie'].join(';');
                Axios.defaults.headers.common.Cookie = cookies;
            }

            token = authenticationResponse.data.key;
            store.set('token', token);
            Axios.defaults.headers.common.Authorization = `Token ${token}`;
        }

        async function logout() {
            try {
                await Axios.post(`${config.backendAPI}/auth/logout`, {
                    proxy: config.proxy,
                });
                removeToken();
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function changePassword(oldPassword, newPassword1, newPassword2) {
            try {
                const data = JSON.stringify({
                    old_password: oldPassword,
                    new_password1: newPassword1,
                    new_password2: newPassword2,
                });
                await Axios.post(`${config.backendAPI}/auth/password/change`, data, {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function requestPasswordReset(email) {
            try {
                const data = JSON.stringify({
                    email,
                });
                await Axios.post(`${config.backendAPI}/auth/password/reset`, data, {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function resetPassword(newPassword1, newPassword2, uid, _token) {
            try {
                const data = JSON.stringify({
                    new_password1: newPassword1,
                    new_password2: newPassword2,
                    uid,
                    token: _token,
                });
                await Axios.post(`${config.backendAPI}/auth/password/reset/confirm`, data, {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function authorized() {
            try {
                await getSelf();
            } catch (serverError) {
                if (serverError.code === 401) {
                    removeToken();
                    return false;
                }

                throw serverError;
            }

            return true;
        }

        async function serverRequest(url, data) {
            try {
                return (
                    await Axios({
                        url,
                        ...data,
                    })
                ).data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function searchProjectNames(search, limit) {
            const { backendAPI, proxy } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/projects`, {
                    proxy,
                    params: {
                        names_only: true,
                        page: 1,
                        page_size: limit,
                        search,
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            response.data.results.count = response.data.count;
            return response.data.results;
        }

        async function getProjects(filter = {}) {
            const { backendAPI, proxy } = config;

            let response = null;
            try {
                if ('id' in filter) {
                    response = await Axios.get(`${backendAPI}/projects/${filter.id}`, {
                        proxy,
                    });
                    const results = [response.data];
                    results.count = 1;
                    return results;
                }

                response = await Axios.get(`${backendAPI}/projects`, {
                    params: {
                        ...filter,
                        page_size: 12,
                    },
                    proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            response.data.results.count = response.data.count;
            return response.data.results;
        }

        async function saveProject(id, projectData) {
            const { backendAPI } = config;

            try {
                await Axios.patch(`${backendAPI}/projects/${id}`, JSON.stringify(projectData), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function deleteProject(id) {
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/projects/${id}`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function createProject(projectSpec) {
            const { backendAPI } = config;

            try {
                const response = await Axios.post(`${backendAPI}/projects`, JSON.stringify(projectSpec), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getTasks(filter = {}) {
            const { backendAPI } = config;

            let response = null;
            try {
                if ('id' in filter) {
                    response = await Axios.get(`${backendAPI}/tasks/${filter.id}`, {
                        proxy: config.proxy,
                    });
                    const results = [response.data];
                    results.count = 1;
                    return results;
                }

                response = await Axios.get(`${backendAPI}/tasks`, {
                    params: {
                        ...filter,
                        page_size: 10,
                    },
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            response.data.results.count = response.data.count;
            return response.data.results;
        }

        async function saveTask(id, taskData) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.patch(`${backendAPI}/tasks/${id}`, JSON.stringify(taskData), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function deleteTask(id, organizationID = null) {
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/tasks/${id}`, {
                    ...(organizationID ? { org: organizationID } : {}),
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        function exportDataset(instanceType) {
            return async function (
                id: number,
                format: string,
                saveImages: boolean,
                useDefaultSettings: boolean,
                targetStorage: Storage,
                name?: string,
            ) {
                const { backendAPI } = config;
                const baseURL = `${backendAPI}/${instanceType}/${id}/${saveImages ? 'dataset' : 'annotations'}`;
                const params: Params = {
                    ...enableOrganization(),
                    ...configureStorage(targetStorage, useDefaultSettings),
                    ...(name ? { filename: name.replace(/\//g, '_') } : {}),
                    format,
                };

                return new Promise<string | void>((resolve, reject) => {
                    async function request() {
                        Axios.get(baseURL, {
                            proxy: config.proxy,
                            params,
                        })
                            .then((response) => {
                                const isCloudStorage = targetStorage.location === StorageLocation.CLOUD_STORAGE;
                                const { status } = response;
                                if (status === 201) params.action = 'download';
                                if (status === 202 || (isCloudStorage && status === 201)) {
                                    setTimeout(request, 3000);
                                } else if (status === 201) {
                                    resolve(`${baseURL}?${new URLSearchParams(params).toString()}`);
                                } else if (isCloudStorage && status === 200) {
                                    resolve();
                                }
                            })
                            .catch((errorData) => {
                                reject(generateError(errorData));
                            });
                    }

                    setTimeout(request);
                });
            };
        }

        async function importDataset(
            id: number,
            format: string,
            useDefaultLocation: boolean,
            sourceStorage: Storage,
            file: File | string,
            onUpdate,
        ) {
            const { backendAPI, origin } = config;
            const params: Params = {
                ...enableOrganization(),
                ...configureStorage(sourceStorage, useDefaultLocation),
                format,
                filename: typeof file === 'string' ? file : file.name,
            };

            const url = `${backendAPI}/projects/${id}/dataset`;

            async function wait() {
                return new Promise<void>((resolve, reject) => {
                    async function requestStatus() {
                        try {
                            const response = await Axios.get(url, {
                                params: { ...params, action: 'import_status' },
                                proxy: config.proxy,
                            });
                            if (response.status === 202) {
                                if (onUpdate && response.data.message) {
                                    onUpdate(response.data.message, response.data.progress || 0);
                                }
                                setTimeout(requestStatus, 3000);
                            } else if (response.status === 201) {
                                resolve();
                            } else {
                                reject(generateError(response));
                            }
                        } catch (error) {
                            reject(generateError(error));
                        }
                    }
                    setTimeout(requestStatus, 2000);
                });
            }
            const isCloudStorage = sourceStorage.location === StorageLocation.CLOUD_STORAGE;

            if (isCloudStorage) {
                try {
                    await Axios.post(url,
                        new FormData(), {
                            params,
                            proxy: config.proxy,
                        });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            } else {
                const uploadConfig = {
                    chunkSize: config.uploadChunkSize * 1024 * 1024,
                    endpoint: `${origin}${backendAPI}/projects/${id}/dataset/`,
                    totalSentSize: 0,
                    totalSize: (file as File).size,
                    onUpdate: (percentage) => {
                        onUpdate('The dataset is being uploaded to the server', percentage);
                    },
                };

                try {
                    await Axios.post(url,
                        new FormData(), {
                            params,
                            proxy: config.proxy,
                            headers: { 'Upload-Start': true },
                        });
                    await chunkUpload(file, uploadConfig);
                    await Axios.post(url,
                        new FormData(), {
                            params,
                            proxy: config.proxy,
                            headers: { 'Upload-Finish': true },
                        });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }
            try {
                return wait();
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function backupTask(id: number, targetStorage: Storage, useDefaultSettings: boolean, fileName?: string) {
            const { backendAPI } = config;
            const params: Params = {
                ...enableOrganization(),
                ...configureStorage(targetStorage, useDefaultSettings),
                ...(fileName ? { filename: fileName } : {}),
            };
            const url = `${backendAPI}/tasks/${id}/backup`;

            return new Promise<void | string>((resolve, reject) => {
                async function request() {
                    try {
                        const response = await Axios.get(url, {
                            proxy: config.proxy,
                            params,
                        });
                        const isCloudStorage = targetStorage.location === StorageLocation.CLOUD_STORAGE;
                        const { status } = response;
                        if (status === 201) params.action = 'download';
                        if (status === 202 || (isCloudStorage && status === 201)) {
                            setTimeout(request, 3000);
                        } else if (status === 201) {
                            resolve(`${url}?${new URLSearchParams(params).toString()}`);
                        } else if (isCloudStorage && status === 200) {
                            resolve();
                        }
                    } catch (errorData) {
                        reject(generateError(errorData));
                    }
                }

                setTimeout(request);
            });
        }

        async function restoreTask(storage: Storage, file: File | string) {
            const { backendAPI } = config;
            // keep current default params to 'freeze" them during this request
            const params: Params = {
                ...enableOrganization(),
                ...configureStorage(storage),
            };

            const url = `${backendAPI}/tasks/backup`;
            const taskData = new FormData();
            let response;

            async function wait() {
                return new Promise((resolve, reject) => {
                    async function checkStatus() {
                        try {
                            taskData.set('rq_id', response.data.rq_id);
                            response = await Axios.post(url, taskData, {
                                proxy: config.proxy,
                                params,
                            });
                            if (response.status === 202) {
                                setTimeout(checkStatus, 3000);
                            } else {
                                // to be able to get the task after it was created, pass frozen params
                                const importedTask = await getTasks({ id: response.data.id, ...params });
                                resolve(importedTask[0]);
                            }
                        } catch (errorData) {
                            reject(generateError(errorData));
                        }
                    }
                    setTimeout(checkStatus);
                });
            }
            const isCloudStorage = storage.location === StorageLocation.CLOUD_STORAGE;

            if (isCloudStorage) {
                params.filename = file as string;
                response = await Axios.post(url,
                    new FormData(), {
                        params,
                        proxy: config.proxy,
                    });
            } else {
                const uploadConfig = {
                    chunkSize: config.uploadChunkSize * 1024 * 1024,
                    endpoint: `${origin}${backendAPI}/tasks/backup/`,
                    totalSentSize: 0,
                    totalSize: (file as File).size,
                };
                await Axios.post(url,
                    new FormData(), {
                        params,
                        proxy: config.proxy,
                        headers: { 'Upload-Start': true },
                    });
                const { filename } = await chunkUpload(file, uploadConfig);
                response = await Axios.post(url,
                    new FormData(), {
                        params: { ...params, filename },
                        proxy: config.proxy,
                        headers: { 'Upload-Finish': true },
                    });
            }
            return wait();
        }

        async function backupProject(
            id: number,
            targetStorage: Storage,
            useDefaultSettings: boolean,
            fileName?: string,
        ) {
            const { backendAPI } = config;
            // keep current default params to 'freeze" them during this request
            const params: Params = {
                ...enableOrganization(),
                ...configureStorage(targetStorage, useDefaultSettings),
                ...(fileName ? { filename: fileName } : {}),
            };

            const url = `${backendAPI}/projects/${id}/backup`;

            return new Promise<void | string>((resolve, reject) => {
                async function request() {
                    try {
                        const response = await Axios.get(url, {
                            proxy: config.proxy,
                            params,
                        });
                        const isCloudStorage = targetStorage.location === StorageLocation.CLOUD_STORAGE;
                        const { status } = response;
                        if (status === 201) params.action = 'download';
                        if (status === 202 || (isCloudStorage && status === 201)) {
                            setTimeout(request, 3000);
                        } else if (status === 201) {
                            resolve(`${url}?${new URLSearchParams(params).toString()}`);
                        } else if (isCloudStorage && status === 200) {
                            resolve();
                        }
                    } catch (errorData) {
                        reject(generateError(errorData));
                    }
                }

                setTimeout(request);
            });
        }

        async function restoreProject(storage: Storage, file: File | string) {
            const { backendAPI } = config;
            // keep current default params to 'freeze" them during this request
            const params: Params = {
                ...enableOrganization(),
                ...configureStorage(storage),
            };

            const url = `${backendAPI}/projects/backup`;
            const projectData = new FormData();
            let response;

            async function wait() {
                return new Promise((resolve, reject) => {
                    async function request() {
                        try {
                            projectData.set('rq_id', response.data.rq_id);
                            response = await Axios.post(`${backendAPI}/projects/backup`, projectData, {
                                proxy: config.proxy,
                                params,
                            });
                            if (response.status === 202) {
                                setTimeout(request, 3000);
                            } else {
                                // to be able to get the task after it was created, pass frozen params
                                const restoredProject = await getProjects({ id: response.data.id, ...params });
                                resolve(restoredProject[0]);
                            }
                        } catch (errorData) {
                            reject(generateError(errorData));
                        }
                    }

                    setTimeout(request);
                });
            }

            const isCloudStorage = storage.location === StorageLocation.CLOUD_STORAGE;

            if (isCloudStorage) {
                params.filename = file;
                response = await Axios.post(url,
                    new FormData(), {
                        params,
                        proxy: config.proxy,
                    });
            } else {
                const uploadConfig = {
                    chunkSize: config.uploadChunkSize * 1024 * 1024,
                    endpoint: `${origin}${backendAPI}/projects/backup/`,
                    totalSentSize: 0,
                    totalSize: (file as File).size,
                };
                await Axios.post(url,
                    new FormData(), {
                        params,
                        proxy: config.proxy,
                        headers: { 'Upload-Start': true },
                    });
                const { filename } = await chunkUpload(file, uploadConfig);
                response = await Axios.post(url,
                    new FormData(), {
                        params: { ...params, filename },
                        proxy: config.proxy,
                        headers: { 'Upload-Finish': true },
                    });
            }
            return wait();
        }

        async function createTask(taskSpec, taskDataSpec, onUpdate) {
            const { backendAPI, origin } = config;
            // keep current default params to 'freeze" them during this request
            const params = enableOrganization();

            async function wait(id) {
                return new Promise((resolve, reject) => {
                    async function checkStatus() {
                        try {
                            const response = await Axios.get(`${backendAPI}/tasks/${id}/status`, { params });
                            if (['Queued', 'Started'].includes(response.data.state)) {
                                if (response.data.message !== '') {
                                    onUpdate(response.data.message, response.data.progress || 0);
                                }
                                setTimeout(checkStatus, 1000);
                            } else if (response.data.state === 'Finished') {
                                resolve();
                            } else if (response.data.state === 'Failed') {
                                // If request has been successful, but task hasn't been created
                                // Then passed data is wrong and we can pass code 400
                                const message = `
                                    Could not create the task on the server. ${response.data.message}.
                                `;
                                reject(new ServerError(message, 400));
                            } else {
                                // If server has another status, it is unexpected
                                // Therefore it is server error and we can pass code 500
                                reject(
                                    new ServerError(
                                        `Unknown task state has been received: ${response.data.state}`,
                                        500,
                                    ),
                                );
                            }
                        } catch (errorData) {
                            reject(generateError(errorData));
                        }
                    }

                    setTimeout(checkStatus, 1000);
                });
            }

            const chunkSize = config.uploadChunkSize * 1024 * 1024;
            const clientFiles = taskDataSpec.client_files;
            const chunkFiles = [];
            const bulkFiles = [];
            let totalSize = 0;
            let totalSentSize = 0;
            for (const file of clientFiles) {
                if (file.size > chunkSize) {
                    chunkFiles.push(file);
                } else {
                    bulkFiles.push(file);
                }
                totalSize += file.size;
            }
            delete taskDataSpec.client_files;

            const taskData = new FormData();
            for (const [key, value] of Object.entries(taskDataSpec)) {
                if (Array.isArray(value)) {
                    value.forEach((element, idx) => {
                        taskData.append(`${key}[${idx}]`, element);
                    });
                } else {
                    taskData.set(key, value);
                }
            }

            let response = null;

            onUpdate('The task is being created on the server..', null);
            try {
                response = await Axios.post(`${backendAPI}/tasks`, JSON.stringify(taskSpec), {
                    proxy: config.proxy,
                    params,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            onUpdate('The data are being uploaded to the server..', null);

            async function bulkUpload(taskId, files) {
                const fileBulks = files.reduce((fileGroups, file) => {
                    const lastBulk = fileGroups[fileGroups.length - 1];
                    if (chunkSize - lastBulk.size >= file.size) {
                        lastBulk.files.push(file);
                        lastBulk.size += file.size;
                    } else {
                        fileGroups.push({ files: [file], size: file.size });
                    }
                    return fileGroups;
                }, [{ files: [], size: 0 }]);
                const totalBulks = fileBulks.length;
                let currentChunkNumber = 0;
                while (currentChunkNumber < totalBulks) {
                    for (const [idx, element] of fileBulks[currentChunkNumber].files.entries()) {
                        taskData.append(`client_files[${idx}]`, element);
                    }
                    const percentage = totalSentSize / totalSize;
                    onUpdate('The data are being uploaded to the server', percentage);
                    await Axios.post(`${backendAPI}/tasks/${taskId}/data`, taskData, {
                        ...params,
                        proxy: config.proxy,
                        headers: { 'Upload-Multiple': true },
                    });
                    for (let i = 0; i < fileBulks[currentChunkNumber].files.length; i++) {
                        taskData.delete(`client_files[${i}]`);
                    }
                    totalSentSize += fileBulks[currentChunkNumber].size;
                    currentChunkNumber++;
                }
            }

            try {
                await Axios.post(`${backendAPI}/tasks/${response.data.id}/data`,
                    taskData, {
                        ...params,
                        proxy: config.proxy,
                        headers: { 'Upload-Start': true },
                    });
                const uploadConfig = {
                    endpoint: `${origin}${backendAPI}/tasks/${response.data.id}/data/`,
                    onUpdate: (percentage) => {
                        onUpdate('The data are being uploaded to the server', percentage);
                    },
                    chunkSize,
                    totalSize,
                    totalSentSize,
                };
                for (const file of chunkFiles) {
                    uploadConfig.totalSentSize += await chunkUpload(file, uploadConfig);
                }
                if (bulkFiles.length > 0) {
                    await bulkUpload(response.data.id, bulkFiles);
                }
                await Axios.post(`${backendAPI}/tasks/${response.data.id}/data`,
                    taskData, {
                        ...params,
                        proxy: config.proxy,
                        headers: { 'Upload-Finish': true },
                    });
            } catch (errorData) {
                try {
                    await deleteTask(response.data.id, params.org || null);
                } catch (_) {
                    // ignore
                }
                throw generateError(errorData);
            }

            try {
                await wait(response.data.id);
            } catch (createException) {
                await deleteTask(response.data.id, params.org || null);
                throw createException;
            }

            // to be able to get the task after it was created, pass frozen params
            const createdTask = await getTasks({ id: response.data.id, ...params });
            return createdTask[0];
        }

        async function getJobs(filter = {}) {
            const { backendAPI } = config;
            const id = filter.id || null;

            let response = null;
            try {
                if (id !== null) {
                    response = await Axios.get(`${backendAPI}/jobs/${id}`, {
                        proxy: config.proxy,
                    });
                } else {
                    response = await Axios.get(`${backendAPI}/jobs`, {
                        proxy: config.proxy,
                        params: {
                            ...filter,
                            page_size: 12,
                        },
                    });
                }
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function getJobIssues(jobID) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/jobs/${jobID}/issues`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function createComment(data) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.post(`${backendAPI}/comments`, JSON.stringify(data), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function createIssue(data) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.post(`${backendAPI}/issues`, JSON.stringify(data), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function updateIssue(issueID, data) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.patch(`${backendAPI}/issues/${issueID}`, JSON.stringify(data), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function deleteIssue(issueID) {
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/issues/${issueID}`);
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function saveJob(id, jobData) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.patch(`${backendAPI}/jobs/${id}`, JSON.stringify(jobData), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function getUsers(filter = { page_size: 'all' }) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/users`, {
                    proxy: config.proxy,
                    params: {
                        ...filter,
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data.results;
        }

        async function getSelf() {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/users/self`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function getPreview(tid, jid) {
            const { backendAPI } = config;

            let response = null;
            try {
                const url = `${backendAPI}/${jid !== null ? 'jobs' : 'tasks'}/${jid || tid}/data`;
                response = await Axios.get(url, {
                    params: {
                        type: 'preview',
                    },
                    proxy: config.proxy,
                    responseType: 'blob',
                });
            } catch (errorData) {
                const code = errorData.response ? errorData.response.status : errorData.code;
                throw new ServerError(`Could not get preview frame for the task ${tid} from the server`, code);
            }

            return response.data;
        }

        async function getImageContext(jid, frame) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/jobs/${jid}/data`, {
                    params: {
                        quality: 'original',
                        type: 'context_image',
                        number: frame,
                    },
                    proxy: config.proxy,
                    responseType: 'blob',
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function getData(tid, jid, chunk) {
            const { backendAPI } = config;

            const url = jid === null ? `tasks/${tid}/data` : `jobs/${jid}/data`;

            let response = null;
            try {
                response = await workerAxios.get(`${backendAPI}/${url}`, {
                    params: {
                        ...enableOrganization(),
                        quality: 'compressed',
                        type: 'chunk',
                        number: chunk,
                    },
                    proxy: config.proxy,
                    responseType: 'arraybuffer',
                });
            } catch (errorData) {
                throw generateError({
                    message: '',
                    response: {
                        ...errorData.response,
                        data: String.fromCharCode.apply(null, new Uint8Array(errorData.response.data)),
                    },
                });
            }

            return response;
        }

        async function getMeta(session, jid) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/${session}s/${jid}/data/meta`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function saveMeta(session, jid, meta) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.patch(`${backendAPI}/${session}s/${jid}/data/meta`, meta, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        // Session is 'task' or 'job'
        async function getAnnotations(session, id) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/${session}s/${id}/annotations`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        // Session is 'task' or 'job'
        async function updateAnnotations(session, id, data, action) {
            const { backendAPI } = config;
            const url = `${backendAPI}/${session}s/${id}/annotations`;
            const params = {};
            let requestFunc = null;

            if (action.toUpperCase() === 'PUT') {
                requestFunc = Axios.put.bind(Axios);
            } else {
                requestFunc = Axios.patch.bind(Axios);
                params.action = action;
            }

            let response = null;
            try {
                response = await requestFunc(url, JSON.stringify(data), {
                    proxy: config.proxy,
                    params,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        // Session is 'task' or 'job'
        async function uploadAnnotations(
            session,
            id: number,
            format: string,
            useDefaultLocation: boolean,
            sourceStorage: Storage,
            file: File | string,
        ) {
            const { backendAPI, origin } = config;
            const params: Params = {
                ...enableOrganization(),
                ...configureStorage(sourceStorage, useDefaultLocation),
                format,
                filename: typeof file === 'string' ? file : file.name,
            };

            const url = `${backendAPI}/${session}s/${id}/annotations`;

            async function wait() {
                return new Promise<void>((resolve, reject) => {
                    async function requestStatus() {
                        try {
                            const response = await Axios.put(
                                url,
                                new FormData(),
                                {
                                    params,
                                    proxy: config.proxy,
                                },
                            );
                            if (response.status === 202) {
                                setTimeout(requestStatus, 3000);
                            } else {
                                resolve();
                            }
                        } catch (errorData) {
                            reject(generateError(errorData));
                        }
                    }
                    setTimeout(requestStatus);
                });
            }
            const isCloudStorage = sourceStorage.location === StorageLocation.CLOUD_STORAGE;

            if (isCloudStorage) {
                try {
                    await Axios.post(url,
                        new FormData(), {
                            params,
                            proxy: config.proxy,
                        });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            } else {
                const chunkSize = config.uploadChunkSize * 1024 * 1024;
                const uploadConfig = {
                    chunkSize,
                    endpoint: `${origin}${backendAPI}/${session}s/${id}/annotations/`,
                };

                try {
                    await Axios.post(url,
                        new FormData(), {
                            params,
                            proxy: config.proxy,
                            headers: { 'Upload-Start': true },
                        });
                    await chunkUpload(file, uploadConfig);
                    await Axios.post(url,
                        new FormData(), {
                            params,
                            proxy: config.proxy,
                            headers: { 'Upload-Finish': true },
                        });
                } catch (errorData) {
                    throw generateError(errorData);
                }
            }

            try {
                return wait();
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        // Session is 'task' or 'job'
        async function dumpAnnotations(id, name, format) {
            const { backendAPI } = config;
            const baseURL = `${backendAPI}/tasks/${id}/annotations`;
            const params = enableOrganization();
            params.format = encodeURIComponent(format);
            if (name) {
                const filename = name.replace(/\//g, '_');
                params.filename = encodeURIComponent(filename);
            }

            return new Promise((resolve, reject) => {
                async function request() {
                    Axios.get(baseURL, {
                        proxy: config.proxy,
                        params,
                    })
                        .then((response) => {
                            if (response.status === 202) {
                                setTimeout(request, 3000);
                            } else {
                                params.action = 'download';
                                resolve(`${baseURL}?${new URLSearchParams(params).toString()}`);
                            }
                        })
                        .catch((errorData) => {
                            reject(generateError(errorData));
                        });
                }

                setTimeout(request);
            });
        }

        async function saveLogs(logs) {
            const { backendAPI } = config;

            try {
                await Axios.post(`${backendAPI}/server/logs`, JSON.stringify(logs), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getLambdaFunctions() {
            const { backendAPI } = config;

            try {
                const response = await Axios.get(`${backendAPI}/lambda/functions`, {
                    proxy: config.proxy,
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function runLambdaRequest(body) {
            const { backendAPI } = config;

            try {
                const response = await Axios.post(`${backendAPI}/lambda/requests`, JSON.stringify(body), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function callLambdaFunction(funId, body) {
            const { backendAPI } = config;

            try {
                const response = await Axios.post(`${backendAPI}/lambda/functions/${funId}`, JSON.stringify(body), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getLambdaRequests() {
            const { backendAPI } = config;

            try {
                const response = await Axios.get(`${backendAPI}/lambda/requests`, {
                    proxy: config.proxy,
                });

                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getRequestStatus(requestID) {
            const { backendAPI } = config;

            try {
                const response = await Axios.get(`${backendAPI}/lambda/requests/${requestID}`, {
                    proxy: config.proxy,
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function cancelLambdaRequest(requestId) {
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/lambda/requests/${requestId}`, {
                    method: 'DELETE',
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        function predictorStatus(projectId) {
            const { backendAPI } = config;

            return new Promise((resolve, reject) => {
                async function request() {
                    try {
                        const response = await Axios.get(`${backendAPI}/predict/status`, {
                            params: {
                                project: projectId,
                            },
                        });
                        return response.data;
                    } catch (errorData) {
                        throw generateError(errorData);
                    }
                }

                const timeoutCallback = async () => {
                    let data = null;
                    try {
                        data = await request();
                        if (data.status === 'queued') {
                            setTimeout(timeoutCallback, 1000);
                        } else if (data.status === 'done') {
                            resolve(data);
                        } else {
                            throw new Error(`Unknown status was received "${data.status}"`);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                setTimeout(timeoutCallback);
            });
        }

        function predictAnnotations(taskId, frame) {
            return new Promise((resolve, reject) => {
                const { backendAPI } = config;

                async function request() {
                    try {
                        const response = await Axios.get(`${backendAPI}/predict/frame`, {
                            params: {
                                task: taskId,
                                frame,
                            },
                        });
                        return response.data;
                    } catch (errorData) {
                        throw generateError(errorData);
                    }
                }

                const timeoutCallback = async () => {
                    let data = null;
                    try {
                        data = await request();
                        if (data.status === 'queued') {
                            setTimeout(timeoutCallback, 1000);
                        } else if (data.status === 'done') {
                            predictAnnotations.latestRequest.fetching = false;
                            resolve(data.annotation);
                        } else {
                            throw new Error(`Unknown status was received "${data.status}"`);
                        }
                    } catch (error) {
                        predictAnnotations.latestRequest.fetching = false;
                        reject(error);
                    }
                };

                const closureId = Date.now();
                predictAnnotations.latestRequest.id = closureId;
                const predicate = () => !predictAnnotations.latestRequest.fetching ||
                    predictAnnotations.latestRequest.id !== closureId;
                if (predictAnnotations.latestRequest.fetching) {
                    waitFor(5, predicate).then(() => {
                        if (predictAnnotations.latestRequest.id !== closureId) {
                            resolve(null);
                        } else {
                            predictAnnotations.latestRequest.fetching = true;
                            setTimeout(timeoutCallback);
                        }
                    });
                } else {
                    predictAnnotations.latestRequest.fetching = true;
                    setTimeout(timeoutCallback);
                }
            });
        }

        predictAnnotations.latestRequest = {
            fetching: false,
            id: null,
        };

        async function installedApps() {
            const { backendAPI } = config;
            try {
                const response = await Axios.get(`${backendAPI}/server/plugins`, {
                    proxy: config.proxy,
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function createCloudStorage(storageDetail) {
            const { backendAPI } = config;

            const storageDetailData = prepareData(storageDetail);
            try {
                const response = await Axios.post(`${backendAPI}/cloudstorages`, storageDetailData, {
                    proxy: config.proxy,
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function updateCloudStorage(id, storageDetail) {
            const { backendAPI } = config;

            const storageDetailData = prepareData(storageDetail);
            try {
                await Axios.patch(`${backendAPI}/cloudstorages/${id}`, storageDetailData, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getCloudStorages(filter = {}) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/cloudstorages`, {
                    proxy: config.proxy,
                    params: filter,
                    page_size: 12,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            response.data.results.count = response.data.count;
            return response.data.results;
        }

        async function getCloudStorageContent(id, manifestPath) {
            const { backendAPI } = config;

            let response = null;
            try {
                const url = `${backendAPI}/cloudstorages/${id}/content${
                    manifestPath ? `?manifest_path=${manifestPath}` : ''
                }`;
                response = await Axios.get(url, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function getCloudStoragePreview(id) {
            const { backendAPI } = config;

            let response = null;
            try {
                const url = `${backendAPI}/cloudstorages/${id}/preview`;
                response = await workerAxios.get(url, {
                    params: enableOrganization(),
                    proxy: config.proxy,
                    responseType: 'arraybuffer',
                });
            } catch (errorData) {
                throw generateError({
                    message: '',
                    response: {
                        ...errorData.response,
                        data: String.fromCharCode.apply(null, new Uint8Array(errorData.response.data)),
                    },
                });
            }

            return new Blob([new Uint8Array(response)]);
        }

        async function getCloudStorageStatus(id) {
            const { backendAPI } = config;

            let response = null;
            try {
                const url = `${backendAPI}/cloudstorages/${id}/status`;
                response = await Axios.get(url, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function deleteCloudStorage(id) {
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/cloudstorages/${id}`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getOrganizations() {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/organizations`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function createOrganization(data) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.post(`${backendAPI}/organizations`, JSON.stringify(data), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function updateOrganization(id, data) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.patch(`${backendAPI}/organizations/${id}`, JSON.stringify(data), {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function deleteOrganization(id) {
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/organizations/${id}`, {
                    proxy: config.proxy,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getOrganizationMembers(orgSlug, page, pageSize, filters = {}) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/memberships`, {
                    proxy: config.proxy,
                    params: {
                        ...filters,
                        org: orgSlug,
                        page,
                        page_size: pageSize,
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function inviteOrganizationMembers(orgId, data) {
            const { backendAPI } = config;
            try {
                await Axios.post(
                    `${backendAPI}/invitations`,
                    {
                        ...data,
                        organization: orgId,
                    },
                    {
                        proxy: config.proxy,
                    },
                );
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function updateOrganizationMembership(membershipId, data) {
            const { backendAPI } = config;
            let response = null;
            try {
                response = await Axios.patch(
                    `${backendAPI}/memberships/${membershipId}`,
                    {
                        ...data,
                    },
                    {
                        proxy: config.proxy,
                    },
                );
            } catch (errorData) {
                throw generateError(errorData);
            }

            return response.data;
        }

        async function deleteOrganizationMembership(membershipId) {
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/memberships/${membershipId}`, {
                    proxy: config.proxy,
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getMembershipInvitation(id) {
            const { backendAPI } = config;

            let response = null;
            try {
                response = await Axios.get(`${backendAPI}/invitations/${id}`, {
                    proxy: config.proxy,
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getWebhookDelivery(webhookID: number, deliveryID: number): Promise<any> {
            const params = enableOrganization();
            const { backendAPI } = config;

            try {
                const response = await Axios.get(`${backendAPI}/webhooks/${webhookID}/deliveries/${deliveryID}`, {
                    proxy: config.proxy,
                    params,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function getWebhooks(filter, pageSize = 10): Promise<any> {
            const params = enableOrganization();
            const { backendAPI } = config;

            try {
                const response = await Axios.get(`${backendAPI}/webhooks`, {
                    proxy: config.proxy,
                    params: {
                        ...params,
                        ...filter,
                        page_size: pageSize,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                response.data.results.count = response.data.count;
                return response.data.results;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function createWebhook(webhookData: any): Promise<any> {
            const params = enableOrganization();
            const { backendAPI } = config;

            try {
                const response = await Axios.post(`${backendAPI}/webhooks`, JSON.stringify(webhookData), {
                    proxy: config.proxy,
                    params,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function updateWebhook(webhookID: number, webhookData: any): Promise<any> {
            const params = enableOrganization();
            const { backendAPI } = config;

            try {
                const response = await Axios
                    .patch(`${backendAPI}/webhooks/${webhookID}`, JSON.stringify(webhookData), {
                        proxy: config.proxy,
                        params,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                return response.data;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function deleteWebhook(webhookID: number): Promise<void> {
            const params = enableOrganization();
            const { backendAPI } = config;

            try {
                await Axios.delete(`${backendAPI}/webhooks/${webhookID}`, {
                    proxy: config.proxy,
                    params,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function pingWebhook(webhookID: number): Promise<any> {
            const params = enableOrganization();
            const { backendAPI } = config;

            async function waitPingDelivery(deliveryID: number): Promise<any> {
                return new Promise((resolve) => {
                    async function checkStatus(): Promise<any> {
                        const delivery = await getWebhookDelivery(webhookID, deliveryID);
                        if (delivery.status_code) {
                            resolve(delivery);
                        } else {
                            setTimeout(checkStatus, 1000);
                        }
                    }
                    setTimeout(checkStatus, 1000);
                });
            }

            try {
                const response = await Axios.post(`${backendAPI}/webhooks/${webhookID}/ping`, {
                    proxy: config.proxy,
                    params,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const deliveryID = response.data.id;
                const delivery = await waitPingDelivery(deliveryID);
                return delivery;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        async function receiveWebhookEvents(type: WebhookSourceType): Promise<string[]> {
            const { backendAPI } = config;

            try {
                const response = await Axios.get(`${backendAPI}/webhooks/events`, {
                    proxy: config.proxy,
                    params: {
                        type,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                return response.data.events;
            } catch (errorData) {
                throw generateError(errorData);
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                server: {
                    value: Object.freeze({
                        about,
                        share,
                        formats,
                        exception,
                        login,
                        logout,
                        changePassword,
                        requestPasswordReset,
                        resetPassword,
                        authorized,
                        register,
                        request: serverRequest,
                        userAgreements,
                        installedApps,
                    }),
                    writable: false,
                },

                projects: {
                    value: Object.freeze({
                        get: getProjects,
                        searchNames: searchProjectNames,
                        save: saveProject,
                        create: createProject,
                        delete: deleteProject,
                        exportDataset: exportDataset('projects'),
                        backup: backupProject,
                        restore: restoreProject,
                        importDataset,
                    }),
                    writable: false,
                },

                tasks: {
                    value: Object.freeze({
                        get: getTasks,
                        save: saveTask,
                        create: createTask,
                        delete: deleteTask,
                        exportDataset: exportDataset('tasks'),
                        backup: backupTask,
                        restore: restoreTask,
                    }),
                    writable: false,
                },

                jobs: {
                    value: Object.freeze({
                        get: getJobs,
                        save: saveJob,
                        exportDataset: exportDataset('jobs'),
                    }),
                    writable: false,
                },

                users: {
                    value: Object.freeze({
                        get: getUsers,
                        self: getSelf,
                    }),
                    writable: false,
                },

                frames: {
                    value: Object.freeze({
                        getData,
                        getMeta,
                        saveMeta,
                        getPreview,
                        getImageContext,
                    }),
                    writable: false,
                },

                annotations: {
                    value: Object.freeze({
                        updateAnnotations,
                        getAnnotations,
                        dumpAnnotations,
                        uploadAnnotations,
                    }),
                    writable: false,
                },

                logs: {
                    value: Object.freeze({
                        save: saveLogs,
                    }),
                    writable: false,
                },

                lambda: {
                    value: Object.freeze({
                        list: getLambdaFunctions,
                        status: getRequestStatus,
                        requests: getLambdaRequests,
                        run: runLambdaRequest,
                        call: callLambdaFunction,
                        cancel: cancelLambdaRequest,
                    }),
                    writable: false,
                },

                issues: {
                    value: Object.freeze({
                        create: createIssue,
                        update: updateIssue,
                        get: getJobIssues,
                        delete: deleteIssue,
                    }),
                    writable: false,
                },

                comments: {
                    value: Object.freeze({
                        create: createComment,
                    }),
                    writable: false,
                },

                predictor: {
                    value: Object.freeze({
                        status: predictorStatus,
                        predict: predictAnnotations,
                    }),
                    writable: false,
                },

                cloudStorages: {
                    value: Object.freeze({
                        get: getCloudStorages,
                        getContent: getCloudStorageContent,
                        getPreview: getCloudStoragePreview,
                        getStatus: getCloudStorageStatus,
                        create: createCloudStorage,
                        delete: deleteCloudStorage,
                        update: updateCloudStorage,
                    }),
                    writable: false,
                },

                organizations: {
                    value: Object.freeze({
                        get: getOrganizations,
                        create: createOrganization,
                        update: updateOrganization,
                        members: getOrganizationMembers,
                        invitation: getMembershipInvitation,
                        delete: deleteOrganization,
                        invite: inviteOrganizationMembers,
                        updateMembership: updateOrganizationMembership,
                        deleteMembership: deleteOrganizationMembership,
                    }),
                    writable: false,
                },

                webhooks: {
                    value: Object.freeze({
                        get: getWebhooks,
                        create: createWebhook,
                        update: updateWebhook,
                        delete: deleteWebhook,
                        ping: pingWebhook,
                        events: receiveWebhookEvents,
                    }),
                    writable: false,
                },
            }),
        );
    }
}

const serverProxy = new ServerProxy();
export default serverProxy;
