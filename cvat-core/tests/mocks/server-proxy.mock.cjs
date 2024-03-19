// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const {
    tasksDummyData,
    tasksDummyLabelsData,
    projectsDummyData,
    projectsDummyLabelsData,
    aboutDummyData,
    formatsDummyData,
    shareDummyData,
    usersDummyData,
    taskAnnotationsDummyData,
    jobAnnotationsDummyData,
    frameMetaDummyData,
    cloudStoragesDummyData,
    webhooksDummyData,
    webhooksEventsDummyData,
    jobsDummyData,
} = require('./dummy-data.mock.cjs');

function QueryStringToJSON(query, ignoreList = []) {
    const pairs = [...new URLSearchParams(query).entries()];

    const result = {};
    for (const pair of pairs) {
        const [key, value] = pair;
        if (!ignoreList.includes(key)) {
            if (['id'].includes(key)) {
                result[key] = +value;
            } else {
                result[key] = value;
            }
        }
    }

    return JSON.parse(JSON.stringify(result));
}

class ServerProxy {
    constructor() {
        async function about() {
            return JSON.parse(JSON.stringify(aboutDummyData));
        }

        async function share(directory) {
            let position = shareDummyData;

            // Emulation of internal directories
            if (directory.length > 1) {
                const components = directory.split('/');

                for (const component of components) {
                    const idx = position.map((x) => x.name).indexOf(component);
                    if (idx !== -1 && 'children' in position[idx]) {
                        position = position[idx].children;
                    } else {
                        throw new window.cvat.exceptions.ServerError(`${component} is not a valid directory`, 400);
                    }
                }
            }

            return JSON.parse(JSON.stringify(position));
        }

        async function formats() {
            return JSON.parse(JSON.stringify(formatsDummyData));
        }

        async function exception() {
            return null;
        }

        async function login() {
            return null;
        }

        async function logout() {
            return null;
        }

        async function getProjects(filter = '') {
            const queries = QueryStringToJSON(filter);
            const result = projectsDummyData.results.filter((x) => {
                for (const key in queries) {
                    if (Object.prototype.hasOwnProperty.call(queries, key)) {
                        // TODO: Particular match for some fields is not checked
                        if (queries[key] !== x[key]) {
                            return false;
                        }
                    }
                }

                return true;
            });

            result.count = result.length;
            return result;
        }

        async function saveProject(id, projectData) {
            const object = projectsDummyData.results.filter((project) => project.id === id)[0];
            for (const prop in projectData) {
                if (
                    Object.prototype.hasOwnProperty.call(projectData, prop) &&
                    Object.prototype.hasOwnProperty.call(object, prop)
                ) {
                    if (prop === 'labels') {
                        const labels = projectsDummyLabelsData[id];
                        // only add new labels here
                        const maxId = Math.max(0, ...labels.map((label) => label.id));
                        const newLabels = [...labels, ...projectData.labels.map((label, index) => (
                            { ...label, id: maxId + index + 1 }
                        ))];

                        projectsDummyLabelsData[object.id] = newLabels;
                    } else {
                        object[prop] = projectData[prop];
                    }
                }
            }

            return (await getProjects({ id }))[0];
        }

        async function createProject(projectData) {
            const id = Math.max(...projectsDummyData.results.map((el) => el.id)) + 1;
            projectsDummyData.results.push({
                id,
                url: `http://localhost:7000/api/projects/${id}`,
                name: projectData.name,
                owner: 1,
                assignee: null,
                bug_tracker: projectData.bug_tracker,
                created_date: '2019-05-16T13:08:00.621747+03:00',
                updated_date: '2019-05-16T13:08:00.621797+03:00',
                status: 'annotation',
                tasks: [],
                labels: JSON.parse(JSON.stringify(projectData.labels)),
            });

            const createdProject = await getProjects(`?id=${id}`);
            return createdProject[0];
        }

        async function deleteProject(id) {
            const projects = projectsDummyData.results;
            const project = projects.filter((el) => el.id === id)[0];
            if (project) {
                projects.splice(projects.indexOf(project), 1);
            }
        }

        async function getTasks(filter = '') {
            // Emulation of a query filter
            const queries = QueryStringToJSON(filter);
            const result = tasksDummyData.results.filter((x) => {
                for (const key in queries) {
                    if (Object.prototype.hasOwnProperty.call(queries, key)) {
                        // TODO: Particular match for some fields is not checked
                        if (queries[key] !== x[key]) {
                            return false;
                        }
                    }
                }

                return true;
            });

            result.count = result.length;
            return result;
        }

        async function saveTask(id, taskData) {
            const object = tasksDummyData.results.filter((task) => task.id === id)[0];
            for (const prop in taskData) {
                if (
                    Object.prototype.hasOwnProperty.call(taskData, prop) &&
                    Object.prototype.hasOwnProperty.call(object, prop)
                ) {
                    if (prop === 'labels') {
                        const labels = (projectsDummyLabelsData[object.project_id] || tasksDummyLabelsData[object.id])
                        // only add new labels here
                        const maxId = Math.max(0, ...labels.map((label) => label.id));
                        const newLabels = [...labels, ...taskData.labels.map((label, index) => (
                            { ...label, id: maxId + index + 1 }
                        ))];

                        if (Number.isInteger(object.project_id)) {
                            projectsDummyLabelsData[object.project_id] = newLabels;
                        } else {
                            tasksDummyLabelsData[object.id] = newLabels;
                        }
                    } else {
                        object[prop] = taskData[prop];
                    }
                }
            }

            const [updatedTask] = await getTasks({ id });
            return updatedTask;
        }

        async function createTask(taskData) {
            const id = Math.max(...tasksDummyData.results.map((el) => el.id)) + 1;
            tasksDummyData.results.push({
                id,
                url: `http://localhost:7000/api/tasks/${id}`,
                name: taskData.name,
                project_id: taskData.project_id || null,
                size: 5000,
                mode: 'interpolation',
                owner: {
                    id: 2,
                    username: 'bsekache',
                },
                assignee: null,
                bug_tracker: taskData.bug_tracker,
                created_date: '2019-05-16T13:08:00.621747+03:00',
                updated_date: '2019-05-16T13:08:00.621797+03:00',
                overlap: taskData.overlap ? taskData.overlap : 5,
                segment_size: taskData.segment_size ? taskData.segment_size : 5000,
                flipped: false,
                status: 'annotation',
                image_quality: taskData.image_quality,
                labels: JSON.parse(JSON.stringify(taskData.labels)),
            });

            const createdTask = await getTasks(`?id=${id}`);
            return createdTask[0];
        }

        async function deleteTask(id) {
            const tasks = tasksDummyData.results;
            const task = tasks.filter((el) => el.id === id)[0];
            if (task) {
                tasks.splice(tasks.indexOf(task), 1);
            }
        }

        async function getLabels(filter) {
            const { task_id, job_id, project_id } = filter;
            if (Number.isInteger(task_id)) {
                const object = tasksDummyData.results.find((task) => task.id === task_id);
                if (Number.isInteger(object.project_id)) {
                    return await getLabels({ project_id: object.project_id });
                }

                const results = tasksDummyLabelsData[task_id] || [];
                return { results, count: results.length };
            }

            if (Number.isInteger(project_id)) {
                const results =  projectsDummyLabelsData[project_id] || [];
                return { results, count: results.length };
            }

            if (Number.isInteger(job_id)) {
                const job = jobsDummyData.results.find((job) => job.id === job_id);
                const project = job && Number.isInteger(job.project_id) ? projectsDummyData.results[job.project_id] : undefined;
                const task = job ? tasksDummyData.results.find((task) => task.id === job.task_id) : undefined;

                if (project) {
                    return await getLabels({ project_id: project.id });
                }

                if (task) {
                    return await getLabels({ task_id: task.id });
                }
            }

            return { results: [], count: 0 };
        }

        async function deleteLabel(id) {
            const containers = [tasksDummyLabelsData, projectsDummyLabelsData];
            for (const container of containers) {
                for (const instanceID in container) {
                    const index = container[instanceID].findIndex((label) => label.id === id);
                    if (index !== -1) {
                        container[instanceID].splice(index, 1);
                    }
                }
            }
        }

        async function updateLabel(body) {
            return body;
        }

        async function getJobs(filter = {}) {
            if (Number.isInteger(filter.id)) {
                // A specific object is requested
                const results = jobsDummyData.results.filter((job) => job.id === filter.id);
                return Object.assign(results, { count: results.length });
            }

            function makeJsonFilter(jsonExpr) {
                if (!jsonExpr) {
                    return (job) => true;
                }

                // This function only covers test cases. Extend it if needed.
                function escapeRegExp(string) {
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                }
                let pattern = JSON.stringify({
                    and: [{ '==': [{ var: 'task_id' }, '<id>'] }]
                });
                pattern = escapeRegExp(pattern).replace('"<id>"', '(\\d+)');
                const matches = jsonExpr.match(pattern);
                const task_id = Number.parseInt(matches[1]);
                return (job) => job.task_id === task_id;
            };

            let jobs = [];
            if (Number.isInteger(filter.id)) {
                jobs = jobsDummyData.results.filter((job) => job.id === filter.id);
            } else if (Number.isInteger(filter.task_id)) {
                jobs = jobsDummyData.results.filter((job) => job.task_id === filter.task_id);
            } else {
                jobs = jobsDummyData.results.filter(makeJsonFilter(filter.filter || null));
            }


            for (const job of jobs) {
                const task = tasksDummyData.results.find((task) => task.id === job.task_id);
                job.dimension = task.dimension;
                job.data_compressed_chunk_type = task.data_compressed_chunk_type;
                job.data_chunk_size = task.data_chunk_size;
                job.bug_tracker = task.bug_tracker;
                job.mode = task.mode;
                job.labels = task.labels;
            }

            return (
                jobs ? Object.assign(jobs, { count: jobs.length }) : {
                    detail: 'Not found.',
                }
            );
        }

        async function saveJob(id, jobData) {
            const object = jobsDummyData.results
                .filter((job) => job.id === id)[0];

            for (const prop in jobData) {
                if (
                    Object.prototype.hasOwnProperty.call(jobData, prop) &&
                    Object.prototype.hasOwnProperty.call(object, prop)
                ) {
                    object[prop] = jobData[prop];
                }
            }

            return (await getJobs({ id }))[0];
        }

        async function getUsers() {
            return JSON.parse(JSON.stringify(usersDummyData)).results;
        }

        async function getSelf() {
            return JSON.parse(JSON.stringify(usersDummyData)).results[0];
        }

        async function getPreview() {
            return null;
        }

        async function getData() {
            return 'DUMMY_IMAGE';
        }

        async function getMeta(session, id) {
            if (session !== 'job') {
                const task = tasksDummyData.results.find((task) => task.id === id);
                const jobs = jobsDummyData.results.filter((job) => job.task_id === id);
                const jobsMeta = jobs.map((job) => frameMetaDummyData[job.id]).flat();
                let framesMeta = jobsMeta.map((jobMeta) => jobMeta.frames);
                if (task.mode === 'interpolation') {
                    framesMeta = [framesMeta[0]];
                }

                return {
                    chunk_size: jobsMeta[0].chunk_size                    ,
                    size: task.size,
                    image_quality: task.image_quality,
                    start_frame: task.start_frame,
                    stop_frame: task.stop_frame,
                    frames: framesMeta,
                    deleted_frames: [],
                    included_frames: [],
                };
            }

            return JSON.parse(JSON.stringify(frameMetaDummyData[id]));
        }

        async function saveMeta(session, jid, meta) {
            if (session !== 'job') {
                throw new Error('not implemented test');
            }
            const object = frameMetaDummyData[jid];
            for (const prop in meta) {
                if (
                    Object.prototype.hasOwnProperty.call(meta, prop) &&
                    Object.prototype.hasOwnProperty.call(object, prop)
                ) {
                    if (prop === 'labels') {
                        object[prop] = meta[prop].filter((label) => !label.deleted);
                    } else {
                        object[prop] = meta[prop];
                    }
                }
            }

            return getMeta(jid);
        }

        async function getAnnotations(session, id) {
            if (session === 'task') {
                return JSON.parse(JSON.stringify(taskAnnotationsDummyData[id]));
            }

            if (session === 'job') {
                return JSON.parse(JSON.stringify(jobAnnotationsDummyData[id]));
            }

            return null;
        }

        async function updateAnnotations(session, id, data, action) {
            // Actually we do not change our dummy data
            // We just update the argument in some way and return it

            data.version += 1;

            if (action === 'create') {
                let idGenerator = 1000;
                data.tracks
                    .concat(data.tags)
                    .concat(data.shapes)
                    .map((el) => {
                        el.id = ++idGenerator;
                        return el;
                    });

                return data;
            }

            if (action === 'update') {
                return data;
            }

            if (action === 'delete') {
                return data;
            }

            return null;
        }

        async function getCloudStorages(filter = '') {
            const queries = QueryStringToJSON(filter);
            const result = cloudStoragesDummyData.results.filter((item) => {
                for (const key in queries) {
                    if (Object.prototype.hasOwnProperty.call(queries, key)) {
                        if (queries[key] !== item[key]) {
                            return false;
                        }
                    }
                }
                return true;
            });
            return result;
        }

        async function updateCloudStorage(id, cloudStorageData) {
            const cloudStorage = cloudStoragesDummyData.results.find((item) => item.id === id);
            if (cloudStorage) {
                for (const prop in cloudStorageData) {
                    if (
                        Object.prototype.hasOwnProperty.call(cloudStorageData, prop) &&
                            Object.prototype.hasOwnProperty.call(cloudStorage, prop)
                    ) {
                        cloudStorage[prop] = cloudStorageData[prop];
                    }
                }
            }
        }

        async function createCloudStorage(cloudStorageData) {
            const id = Math.max(...cloudStoragesDummyData.results.map((item) => item.id)) + 1;
            cloudStoragesDummyData.results.push({
                id,
                provider_type: cloudStorageData.provider_type,
                resource: cloudStorageData.resource,
                display_name: cloudStorageData.display_name,
                credentials_type: cloudStorageData.credentials_type,
                specific_attributes: cloudStorageData.specific_attributes,
                description: cloudStorageData.description,
                owner: 1,
                created_date: '2021-09-01T09:29:47.094244+03:00',
                updated_date: '2021-09-01T09:29:47.103264+03:00',
            });

            const result = await getCloudStorages(`?id=${id}`);
            return result[0];
        }

        async function deleteCloudStorage(id) {
            const cloudStorages = cloudStoragesDummyData.results;
            const cloudStorageId = cloudStorages.findIndex((item) => item.id === id);
            if (cloudStorageId !== -1) {
                cloudStorages.splice(cloudStorageId);
            }
        }

        async function getWebhooks(filter = '') {
            const queries = QueryStringToJSON(filter);
            const result = webhooksDummyData.results.filter((item) => {
                for (const key in queries) {
                    if (Object.prototype.hasOwnProperty.call(queries, key)) {
                        if (queries[key] !== item[key]) {
                            return false;
                        }
                    }
                }
                return true;
            });
            return result;
        }

        async function createWebhook(webhookData) {
            const id = Math.max(...webhooksDummyData.results.map((item) => item.id)) + 1;
            webhooksDummyData.results.push({
                id,
                description: webhookData.description,
                target_url: webhookData.target_url,
                content_type: webhookData.content_type,
                secret: webhookData.secret,
                enable_ssl: webhookData.enable_ssl,
                is_active: webhookData.is_active,
                events: webhookData.events,
                organization_id: webhookData.organization_id ? webhookData.organization_id : null,
                project_id: webhookData.project_id ? webhookData.project_id : null,
                type: webhookData.type,
                owner: { id: 1 },
                created_date: '2022-09-23T06:29:12.337276Z',
                updated_date: '2022-09-23T06:29:12.337276Z',
            });

            const result = await getWebhooks(`?id=${id}`);
            return result[0];
        }

        async function updateWebhook(webhookID, webhookData) {
            const webhook = webhooksDummyData.results.find((item) => item.id === webhookID);
            if (webhook) {
                for (const prop in webhookData) {
                    if (
                        Object.prototype.hasOwnProperty.call(webhookData, prop) &&
                            Object.prototype.hasOwnProperty.call(webhook, prop)
                    ) {
                        webhook[prop] = webhookData[prop];
                    }
                }
            }
            return webhook;
        }

        async function receiveWebhookEvents(type) {
            return webhooksEventsDummyData[type]?.events;
        }

        async function deleteWebhook(webhookID) {
            const webhooks = webhooksDummyData.results;
            const webhookIdx = webhooks.findIndex((item) => item.id === webhookID);
            if (webhookIdx !== -1) {
                webhooks.splice(webhookIdx);
            }
        }

        async function acceptInvitation() {
            return '';
        }

        async function declineInvitation() {
            return;
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
                    }),
                    writable: false,
                },

                projects: {
                    value: Object.freeze({
                        get: getProjects,
                        save: saveProject,
                        create: createProject,
                        delete: deleteProject,
                    }),
                    writable: false,
                },

                tasks: {
                    value: Object.freeze({
                        get: getTasks,
                        save: saveTask,
                        create: createTask,
                        delete: deleteTask,
                        getPreview: getPreview,
                    }),
                    writable: false,
                },

                labels: {
                    value: Object.freeze({
                        get: getLabels,
                        delete: deleteLabel,
                        update: updateLabel,
                    }),
                    writable: false,
                },

                jobs: {
                    value: Object.freeze({
                        get: getJobs,
                        save: saveJob,
                        getPreview: getPreview,
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
                    }),
                    writable: false,
                },

                annotations: {
                    value: {
                        updateAnnotations,
                        getAnnotations,
                    },
                },

                cloudStorages: {
                    value: Object.freeze({
                        get: getCloudStorages,
                        update: updateCloudStorage,
                        create: createCloudStorage,
                        delete: deleteCloudStorage,
                    }),
                    writable: false,
                },

                webhooks: {
                    value: Object.freeze({
                        get: getWebhooks,
                        create: createWebhook,
                        update: updateWebhook,
                        delete: deleteWebhook,
                        events: receiveWebhookEvents,
                    }),
                    writable: false,
                },

                organizations: {
                    value: Object.freeze({
                        acceptInvitation: acceptInvitation,
                        declineInvitation: declineInvitation,
                    }),
                    writable: false,
                },
            }),
        );
    }
}

const serverProxy = new ServerProxy();
module.exports = serverProxy;
