// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const {
    tasksDummyData,
    projectsDummyData,
    aboutDummyData,
    formatsDummyData,
    shareDummyData,
    usersDummyData,
    taskAnnotationsDummyData,
    jobAnnotationsDummyData,
    frameMetaDummyData,
    cloudStoragesDummyData,
} = require('./dummy-data.mock');

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
                        object[prop] = projectData[prop].filter((label) => !label.deleted);
                    } else {
                        object[prop] = projectData[prop];
                    }
                }
            }
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
                        object[prop] = taskData[prop].filter((label) => !label.deleted);
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

        async function getJobs(filter = {}) {
            const id = filter.id || null;
            const jobs = tasksDummyData.results
                .reduce((acc, task) => {
                    for (const segment of task.segments) {
                        for (const job of segment.jobs) {
                            const copy = JSON.parse(JSON.stringify(job));
                            copy.start_frame = segment.start_frame;
                            copy.stop_frame = segment.stop_frame;
                            copy.task_id = task.id;
                            copy.dimension = task.dimension;
                            copy.data_compressed_chunk_type = task.data_compressed_chunk_type;
                            copy.data_chunk_size = task.data_chunk_size;
                            copy.bug_tracker = task.bug_tracker;
                            copy.mode = task.mode;
                            copy.labels = task.labels;

                            acc.push(copy);
                        }
                    }

                    return acc;
                }, [])
                .filter((job) => job.id === id);

            return (
                jobs[0] || {
                    detail: 'Not found.',
                }
            );
        }

        async function saveJob(id, jobData) {
            const object = tasksDummyData.results
                .reduce((acc, task) => {
                    for (const segment of task.segments) {
                        for (const job of segment.jobs) {
                            acc.push(job);
                        }
                    }

                    return acc;
                }, [])
                .filter((job) => job.id === id)[0];

            for (const prop in jobData) {
                if (
                    Object.prototype.hasOwnProperty.call(jobData, prop) &&
                    Object.prototype.hasOwnProperty.call(object, prop)
                ) {
                    object[prop] = jobData[prop];
                }
            }

            return getJobs({ id });
        }

        async function getUsers() {
            return JSON.parse(JSON.stringify(usersDummyData)).results;
        }

        async function getSelf() {
            return JSON.parse(JSON.stringify(usersDummyData)).results[0];
        }

        async function getPreview() {
            return 'DUMMY_IMAGE';
        }

        async function getData() {
            return 'DUMMY_IMAGE';
        }

        async function getMeta(tid) {
            return JSON.parse(JSON.stringify(frameMetaDummyData[tid]));
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
                    }),
                    writable: false,
                },

                jobs: {
                    value: Object.freeze({
                        get: getJobs,
                        save: saveJob,
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
            }),
        );
    }
}

const serverProxy = new ServerProxy();
module.exports = serverProxy;
