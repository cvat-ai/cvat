/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/


(() => {
    /**
        * Class representing a task
        * @memberof module:API.cvat.classes
    */
    class Task {
        /**
            * In a fact you need use the constructor only if you want create a task
            * @param {object} initialData - Object which is used for initalization
            * <br> It can contain keys:
            * <br> <li style="margin-left: 10px;"> name
            * <br> <li style="margin-left: 10px;"> assignee
            * <br> <li style="margin-left: 10px;"> bug_tracker
            * <br> <li style="margin-left: 10px;"> z_order
            * <br> <li style="margin-left: 10px;"> labels
            * <br> <li style="margin-left: 10px;"> segment_size
            * <br> <li style="margin-left: 10px;"> overlap
        */
        constructor(initialData) {
            this.annotations = Object.freeze({
                upload: window.cvat.Task.annotations.upload.bind(this),
                save: window.cvat.Task.annotations.save.bind(this),
                clear: window.cvat.Task.annotations.clear.bind(this),
                dump: window.cvat.Task.annotations.dump.bind(this),
                statistics: window.cvat.Task.annotations.statistics.bind(this),
                put: window.cvat.Task.annotations.put.bind(this),
                get: window.cvat.Task.annotations.get.bind(this),
                search: window.cvat.Task.annotations.search.bind(this),
                select: window.cvat.Task.annotations.select.bind(this),
            });

            this.frames = Object.freeze({
                get: window.cvat.Task.frames.get.bind(this),
            });

            this.logs = Object.freeze({
                put: window.cvat.Task.logs.put.bind(this),
                save: window.cvat.Task.logs.save.bind(this),
            });

            this.actions = Object.freeze({
                undo: window.cvat.Task.actions.undo.bind(this),
                redo: window.cvat.Task.actions.redo.bind(this),
                clear: window.cvat.Task.actions.clear.bind(this),
            });

            this.events = Object.freeze({
                subscribe: window.cvat.Task.events.subscribe.bind(this),
                unsubscribe: window.cvat.Task.events.unsubscribe.bind(this),
            });

            const data = {
                id: undefined,
                name: undefined,
                status: undefined,
                size: undefined,
                mode: undefined,
                owner: undefined,
                assignee: undefined,
                created_date: undefined,
                updated_date: undefined,
                bug_tracker: undefined,
                overlap: undefined,
                segment_size: undefined,
                z_order: undefined,
            };

            for (const property in data) {
                if (Object.prototype.hasOwnProperty.call(data, property)
                    && property in initialData) {
                    data[property] = initialData[property];
                }
            }

            data.labels = [];
            data.jobs = [];
            data.files = Object.freeze({
                server_files: [],
                client_files: [],
                remote_files: [],
            });

            if (Array.isArray(initialData.segments)) {
                for (const segment of initialData.segments) {
                    if (Array.isArray(segment.jobs)) {
                        for (const job of segment.jobs) {
                            const jobInstance = new window.cvat.classes.Job({
                                url: job.url,
                                id: job.id,
                                assignee: job.assignee,
                                status: job.status,
                                start_frame: segment.start_frame,
                                stop_frame: segment.stop_frame,
                                task: this,
                            });
                            data.jobs.push(jobInstance);
                        }
                    }
                }
            }

            if (Array.isArray(initialData.labels)) {
                for (const label of initialData.labels) {
                    const classInstance = new window.cvat.classes.Label(label);
                    data.labels.push(classInstance);
                }
            }

            Object.defineProperties(this, {
                id: {
                    /**
                        * @name id
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => data.id,
                },
                name: {
                    /**
                        * @name name
                        * @type {string}
                        * @memberof module:API.cvat.classes.Task
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.name,
                    set: () => (value) => {
                        if (!value.trim().length) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must not be empty',
                            );
                        }
                        data.name = value;
                    },
                },
                status: {
                    /**
                        * @name status
                        * @type {module:API.cvat.enums.TaskStatus}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => data.status,
                },
                size: {
                    /**
                        * @name size
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => data.size,
                },
                mode: {
                    /**
                        * @name mode
                        * @type {TaskMode}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => data.mode,
                },
                owner: {
                    /**
                        * Identificator of a user who has created the task
                        * @name owner
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => data.owner,
                },
                assignee: {
                    /**
                        * Identificator of a user who is responsible for the task
                        * @name assignee
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Task
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.assignee,
                    set: () => (assignee) => {
                        if (!Number.isInteger(assignee) || assignee < 0) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a non negative integer',
                            );
                        }
                        data.assignee = assignee;
                    },
                },
                createdDate: {
                    /**
                        * @name createdDate
                        * @type {string}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => data.created_date,
                },
                updatedDate: {
                    /**
                        * @name updatedDate
                        * @type {string}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => data.updated_date,
                },
                bugTracker: {
                    /**
                        * @name bugTracker
                        * @type {string}
                        * @memberof module:API.cvat.classes.Task
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.bug_tracker,
                    set: () => (tracker) => {
                        data.bug_tracker = tracker;
                    },
                },
                overlap: {
                    /**
                        * @name overlap
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Task
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.overlap,
                    set: () => (overlap) => {
                        if (!Number.isInteger(overlap) || overlap < 0) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a non negative integer',
                            );
                        }
                        data.overlap = overlap;
                    },
                },
                segmentSize: {
                    /**
                        * @name segmentSize
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Task
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.segment_size,
                    set: (segment) => {
                        if (!Number.isInteger(segment) || segment < 0) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a positive integer',
                            );
                        }
                        data.segment_size = segment;
                    },
                },
                zOrder: {
                    /**
                        * @name zOrder
                        * @type {boolean}
                        * @memberof module:API.cvat.classes.Task
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.z_order,
                    set: (zOrder) => {
                        if (typeof (zOrder) !== 'boolean') {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a boolean value',
                            );
                        }
                        data.z_order = zOrder;
                    },
                },
                labels: {
                    /**
                        * After task has been created value can be appended only.
                        * @name labels
                        * @type {module:API.cvat.classes.Label[]}
                        * @memberof module:API.cvat.classes.Task
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => [...data.labels],
                    set: (labels) => {
                        if (!Array.isArray(labels)) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be an array of Labels',
                            );
                        }

                        for (const label of labels) {
                            if (!(label instanceof window.cvat.classes.Label)) {
                                throw new window.cvat.exceptions.ArgumentError(
                                    'Each array value must be an instance of Label. '
                                        + `${typeof (label)} was found`,
                                );
                            }
                        }

                        if (typeof (data.id) === 'undefined') {
                            data.labels = [...labels];
                        } else {
                            data.labels = data.labels.concat([...labels]);
                        }
                    },
                },
                jobs: {
                    /**
                        * @name jobs
                        * @type {module:API.cvat.classes.Job[]}
                        * @memberof module:API.cvat.classes.Task
                        * @readonly
                        * @instance
                    */
                    get: () => [...data.jobs],
                },
                /**
                    * List of files from shared resource
                    * @name serverFiles
                    * @type {string[]}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                serverFiles: {
                    get: () => [...data.files.serverFiles],
                    set: (serverFiles) => {
                        if (!Array.isArray(serverFiles)) {
                            throw new window.cvat.exceptions.ArgumentError(
                                `Value must be an array. But ${typeof (serverFiles)} has been got.`,
                            );
                        }

                        for (const value of serverFiles) {
                            if (typeof (value) !== 'string') {
                                throw new window.cvat.exceptions.ArgumentError(
                                    `Array values must be a string. But ${typeof (value)} has been got.`,
                                );
                            }
                        }

                        data.files.server_files = serverFiles;
                    },
                },
                /**
                    * List of files from client host
                    * @name clientFiles
                    * @type {File[]}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                clientFiles: {
                    get: () => [...data.files.clientFiles],
                    set: (clientFiles) => {
                        if (!Array.isArray(clientFiles)) {
                            throw new window.cvat.exceptions.ArgumentError(
                                `Value must be an array. But ${typeof (clientFiles)} has been got.`,
                            );
                        }

                        for (const value of clientFiles) {
                            if (!(value instanceof window.File)) {
                                throw new window.cvat.exceptions.ArgumentError(
                                    `Array values must be a File. But ${value.constructor.name} has been got.`,
                                );
                            }
                        }

                        data.files.client_files = clientFiles;
                    },
                },
            });
        }
    }

    module.exports = Task;
})();
