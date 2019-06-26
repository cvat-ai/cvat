/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* eslint prefer-arrow-callback: [ "error", { "allowNamedFunctions": true } ] */

/* global
    require:false
*/


(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');

    const {
        Task,
        Job,
    } = require('./session');

    function isBoolean(value) {
        return typeof (value) === 'boolean';
    }

    function isInteger(value) {
        return typeof (value) === 'number' && Number.isInteger(value);
    }

    function isEnum(value) {
        // Called with specific Enum context
        for (const key in this) {
            if (Object.prototype.hasOwnProperty.call(this, key)) {
                if (this[key] === value) {
                    return true;
                }
            }
        }

        return false;
    }

    function isString(value) {
        return typeof (value) === 'string';
    }

    function checkFilter(filter, fields) {
        for (const prop in filter) {
            if (Object.prototype.hasOwnProperty.call(filter, prop)) {
                if (!(prop in fields)) {
                    throw new window.cvat.exceptions.ArgumentError(
                        `Unsupported filter property has been recieved: "${prop}"`,
                    );
                } else if (!fields[prop](filter[prop])) {
                    throw new window.cvat.exceptions.ArgumentError(
                        `Received filter property ${prop} is not satisfied for checker`,
                    );
                }
            }
        }
    }

    const hidden = require('./hidden');
    function setupEnv(wrappedFunction) {
        return async function wrapper(...args) {
            try {
                if (this instanceof window.cvat.classes.Task) {
                    hidden.taskID = this.id;
                } else if (this instanceof window.cvat.classes.Job) {
                    hidden.jobID = this.id;
                    hidden.taskID = this.task.id;
                } else {
                    throw new window.cvat.exceptions.ScriptingError('Bad context for the function');
                }

                const result = await wrappedFunction.call(this, ...args);
                return result;
            } finally {
                delete hidden.taskID;
                delete hidden.jobID;
            }
        };
    }

    function implementAPI(cvat) {
        cvat.plugins.list.implementation = PluginRegistry.list;
        cvat.plugins.register.implementation = PluginRegistry.register;

        cvat.server.about.implementation = async () => {
            const result = await serverProxy.server.about();
            return result;
        };

        cvat.server.share.implementation = async (directory) => {
            const result = await serverProxy.server.share(directory);
            return result;
        };

        cvat.server.login.implementation = async (username, password) => {
            await serverProxy.server.login(username, password);
        };

        cvat.users.get.implementation = async (filter) => {
            checkFilter(filter, {
                self: isBoolean,
            });

            let users = null;
            if ('self' in filter && filter.self) {
                users = await serverProxy.users.getSelf();
                users = [users];
            } else {
                users = await serverProxy.users.getUsers();
            }

            users = users.map(user => new window.cvat.classes.User(user));
            return users;
        };

        cvat.jobs.get.implementation = async (filter) => {
            checkFilter(filter, {
                taskID: isInteger,
                jobID: isInteger,
            });

            if (('taskID' in filter) && ('jobID' in filter)) {
                throw new window.cvat.exceptions.ArgumentError(
                    'Only one of fields "taskID" and "jobID" allowed simultaneously',
                );
            }

            if (!Object.keys(filter).length) {
                throw new window.cvat.exceptions.ArgumentError(
                    'Job filter must not be empty',
                );
            }

            let task = null;
            if ('taskID' in filter) {
                task = await serverProxy.tasks.getTasks(`id=${filter.taskID}`);
            } else {
                const [job] = await serverProxy.jobs.getJob(filter.jobID);
                task = await serverProxy.tasks.getTasks(`id=${job.task_id}`);
            }

            // If task was found by its id, then create task instance and get Job instance from it
            if (task.length) {
                task = new window.cvat.classes.Task(task[0]);
                return filter.jobID ? task.jobs.filter(job => job.id === filter.jobID) : task.jobs;
            }

            return [];
        };

        cvat.tasks.get.implementation = async (filter) => {
            checkFilter(filter, {
                page: isInteger,
                name: isString,
                id: isInteger,
                owner: isString,
                assignee: isString,
                search: isString,
                status: isEnum.bind(window.cvat.enums.TaskStatus),
                mode: isEnum.bind(window.cvat.enums.TaskMode),
            });

            if ('search' in filter && Object.keys(filter).length > 1) {
                if (!('page' in filter && Object.keys(filter).length === 2)) {
                    throw new window.cvat.exceptions.ArgumentError(
                        'Do not use the filter field "search" with others',
                    );
                }
            }

            if ('id' in filter && Object.keys(filter).length > 1) {
                if (!('page' in filter && Object.keys(filter).length === 2)) {
                    throw new window.cvat.exceptions.ArgumentError(
                        'Do not use the filter field "id" with others',
                    );
                }
            }

            const searchParams = new URLSearchParams();
            for (const field of ['name', 'owner', 'assignee', 'search', 'status', 'mode', 'id', 'page']) {
                if (Object.prototype.hasOwnProperty.call(filter, field)) {
                    searchParams.set(field, filter[field]);
                }
            }

            const tasksData = await serverProxy.tasks.getTasks(searchParams.toString());
            const tasks = tasksData.map(task => new window.cvat.classes.Task(task));
            tasks.count = tasksData.count;

            return tasks;
        };

        Task.prototype.save.implementation = setupEnv(
            async function saveTaskImplementation(onUpdate) {
                // TODO: Add ability to change an owner and an assignee
                if (typeof (this.id) !== 'undefined') {
                    // If the task has been already created, we update it
                    const taskData = {
                        name: this.name,
                        bug_tracker: this.bugTracker,
                        z_order: this.zOrder,
                        labels: [...this.labels.map(el => el.toJSON())],
                    };

                    await serverProxy.tasks.saveTask(this.id, taskData);
                    return this;
                }

                const taskData = {
                    name: this.name,
                    labels: this.labels.map(el => el.toJSON()),
                    image_quality: this.imageQuality,
                    z_order: Boolean(this.zOrder),
                };

                if (this.bugTracker) {
                    taskData.bug_tracker = this.bugTracker;
                }
                if (this.segmentSize) {
                    taskData.segment_size = this.segmentSize;
                }
                if (this.overlap) {
                    taskData.overlap = this.overlap;
                }

                const taskFiles = {
                    client_files: this.clientFiles,
                    server_files: this.serverFiles,
                    remote_files: this.remoteFiles,
                };

                const task = await serverProxy.tasks.createTask(taskData, taskFiles, onUpdate);
                return new Task(task);
            },
        );

        Task.prototype.delete.implementation = setupEnv(
            async function deleteTaskImplementation() {
                await serverProxy.tasks.deleteTask(this.id);
            },
        );

        Job.prototype.save.implementation = setupEnv(
            async function saveJobImplementation() {
                // TODO: Add ability to change an assignee
                if (this.id) {
                    const jobData = {
                        status: this.status,
                    };

                    await serverProxy.jobs.saveJob(this.id, jobData);
                    return this;
                }

                throw window.cvat.exceptions.ArgumentError(
                    'Can not save job without and id',
                );
            },
        );


        return cvat;
    }

    module.exports = implementAPI;
})();
