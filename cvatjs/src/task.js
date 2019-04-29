/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    global:false
*/

(() => {
    /**
        * Class representing a task
        * @memberof module:API.cvat.classes
    */
    class Task {
        constructor(initialData) {
            this.annotations = Object.freeze({
                upload: global.cvat.Task.annotations.upload.bind(this),
                save: global.cvat.Task.annotations.save.bind(this),
                clear: global.cvat.Task.annotations.clear.bind(this),
                dump: global.cvat.Task.annotations.dump.bind(this),
                statistics: global.cvat.Task.annotations.statistics.bind(this),
                put: global.cvat.Task.annotations.put.bind(this),
                get: global.cvat.Task.annotations.get.bind(this),
                search: global.cvat.Task.annotations.search.bind(this),
                select: global.cvat.Task.annotations.select.bind(this),
            });

            this.frames = Object.freeze({
                get: global.cvat.Task.frames.get.bind(this),
            });

            this.logs = Object.freeze({
                put: global.cvat.Task.logs.put.bind(this),
                save: global.cvat.Task.logs.save.bind(this),
            });

            this.actions = Object.freeze({
                undo: global.cvat.Task.actions.undo.bind(this),
                redo: global.cvat.Task.actions.redo.bind(this),
                clear: global.cvat.Task.actions.clear.bind(this),
            });

            this.events = Object.freeze({
                subscribe: global.cvat.Task.events.subscribe.bind(this),
                unsubscribe: global.cvat.Task.events.unsubscribe.bind(this),
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
                labels: [],
                jobs: [],
                files: Object.freeze({
                    server_files: [],
                    client_files: [],
                    remote_files: [],
                }),
            };

            for (const property in data) {
                if (Object.prototype.hasOwnProperty.call(data, property)
                    && property in initialData) {
                    data[property] = initialData[property];
                }
            }

            if (Array.isArray(initialData.segments)) {
                for (const segment of initialData.segments) {
                    if (Array.isArray(segment.jobs)) {
                        for (const job of segment.jobs) {
                            const jobInstance = new global.cvat.classes.Job({
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
                            throw new global.cvat.exceptions.ArgumentError(
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
                            throw new global.cvat.exceptions.ArgumentError(
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
                            throw new global.cvat.exceptions.ArgumentError(
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
                            throw new global.cvat.exceptions.ArgumentError(
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
                            throw new global.cvat.exceptions.ArgumentError(
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
                            throw new global.cvat.exceptions.ArgumentError(
                                'Value must be an array of Labels',
                            );
                        }

                        for (const label of labels) {
                            if (!(label instanceof global.cvat.classes.Label)) {
                                throw new global.cvat.exceptions.ArgumentError(
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
            });
        }
    }

    module.exports = Task;
})();
