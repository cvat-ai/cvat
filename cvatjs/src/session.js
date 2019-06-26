/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const PluginRegistry = require('./plugins');

    /**
        * Base abstract class for Task and Job. It contains common members.
        * @hideconstructor
        * @virtual
    */
    class Session {
        constructor() {
            /**
                * An interaction with annotations
                * @namespace annotations
                * @memberof Session
            */
            /**
                * Upload annotations from a dump file
                * @method upload
                * @memberof Session.annotations
                * @param {File} [annotations] - text file with annotations
                * @instance
                * @async
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
            */
            /**
                * Save annotation changes on a server
                * @method save
                * @memberof Session.annotations
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @instance
                * @async
            */
            /**
                * Remove all annotations from a session
                * @method clear
                * @memberof Session.annotations
                * @throws {module:API.cvat.exceptions.PluginError}
                * @instance
                * @async
            */
            /**
                * Dump of annotations to a file.
                * Method always dumps annotations for a whole task.
                * @method dump
                * @memberof Session.annotations
                * @returns {string} URL which can be used in order to get a dump file
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @instance
                * @async
            */
            /**
                * Collect some statistics from a session.
                * For example number of shapes, tracks, polygons etc
                * @method statistics
                * @memberof Session.annotations
                * @returns {module:API.cvat.classes.Statistics} statistics object
                * @throws {module:API.cvat.exceptions.PluginError}
                * @instance
                * @async
            */
            /**
                * Add some annotations to a session
                * @method put
                * @memberof Session.annotations
                * @param {module:API.cvat.classes.ObjectState[]} data
                * array of objects on the specific frame
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
            /**
                * @typedef {Object} ObjectFilter
                * @property {string} [label] a name of a label
                * @property {module:API.cvat.enums.ObjectType} [type]
                * @property {module:API.cvat.enums.ObjectShape} [shape]
                * @property {boolean} [occluded] a value of occluded property
                * @property {boolean} [lock] a value of lock property
                * @property {number} [width] a width of a shape
                * @property {number} [height] a height of a shape
                * @property {Object[]} [attributes] dictionary with "name: value" pairs
                * @global
            */
            /**
                * Get annotations for a specific frame
                * @method get
                * @param {integer} frame get objects from the frame
                * @param {ObjectFilter[]} [filter = []]
                * get only objects are satisfied to specific filter
                * @returns {module:API.cvat.classes.ObjectState[]}
                * @memberof Session.annotations
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
            /**
                * Find frame which contains at least one object satisfied to a filter
                * @method search
                * @memberof Session.annotations
                * @param {ObjectFilter} [filter = []] filter
                * @param {integer} from lower bound of a search
                * @param {integer} to upper bound of a search
                * @returns {integer} the nearest frame which contains filtered objects
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
            /**
                * Select shape under a cursor using smart alghorithms
                * @method select
                * @memberof Session.annotations
                * @param {integer} frame frame for selecting
                * @param {float} x horizontal coordinate
                * @param {float} y vertical coordinate
                * @returns {(integer|null)}
                * identifier of a selected object or null if no one of objects is on position
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */


            /**
                * Namespace is used for an interaction with frames
                * @namespace frames
                * @memberof Session
            */
            /**
                * Get frame by its number
                * @method get
                * @memberof Session.frames
                * @param {integer} frame number of frame which you want to get
                * @returns {module:API.cvat.classes.FrameData}
                * @instance
                * @async
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
            */

            /**
                * Namespace is used for an interaction with logs
                * @namespace logs
                * @memberof Session
            */

            /**
                * Append log to a log collection.
                * Continue logs will have been added after "close" method is called
                * @method put
                * @memberof Session.logs
                * @param {module:API.cvat.enums.LogType} type a type of a log
                * @param {boolean} continuous log is a continuous log
                * @param {Object} details any others data which will be append to log data
                * @returns {module:API.cvat.classes.Log}
                * @instance
                * @async
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
            */
            /**
                * Save accumulated logs on a server
                * @method save
                * @memberof Session.logs
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @instance
                * @async
            */

            /**
                * Namespace is used for an interaction with actions
                * @namespace actions
                * @memberof Session
            */

            /**
                * Is a dictionary of pairs "id:action" where "id" is an identifier of an object
                * which has been affected by undo/redo and "action" is what exactly has been
                * done with the object. Action can be: "created", "deleted", "updated".
                * Size of an output array equal the param "count".
                * @typedef {Object} HistoryAction
                * @global
            */
            /**
                * Undo actions
                * @method undo
                * @memberof Session.actions
                * @returns {HistoryAction}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @instance
                * @async
            */
            /**
                * Redo actions
                * @method redo
                * @memberof Session.actions
                * @returns {HistoryAction}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @instance
                * @async
            */


            /**
                * Namespace is used for an interaction with events
                * @namespace events
                * @memberof Session
            */
            /**
                * Subscribe on an event
                * @method subscribe
                * @memberof Session.events
                * @param {module:API.cvat.enums.EventType} type - event type
                * @param {functions} callback - function which will be called on event
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
            /**
                * Unsubscribe from an event. If callback is not provided,
                * all callbacks will be removed from subscribers for the event
                * @method unsubscribe
                * @memberof Session.events
                * @param {module:API.cvat.enums.EventType} type - event type
                * @param {functions} [callback = null] - function which is called on event
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
        }
    }

    /**
        * Class representing a job.
        * @memberof module:API.cvat.classes
        * @hideconstructor
        * @extends Session
    */
    class Job extends Session {
        constructor(initialData) {
            super();
            const data = {
                id: undefined,
                assignee: undefined,
                status: undefined,
                start_frame: undefined,
                stop_frame: undefined,
                task: undefined,
            };

            for (const property in data) {
                if (Object.prototype.hasOwnProperty.call(data, property)) {
                    if (property in initialData) {
                        data[property] = initialData[property];
                    }

                    if (data[property] === undefined) {
                        throw new window.cvat.exceptions.ArgumentError(
                            `Job field "${property}" was not initialized`,
                        );
                    }
                }
            }

            Object.defineProperties(this, Object.freeze({
                /**
                    * @name id
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Job
                    * @readonly
                    * @instance
                */
                id: {
                    get: () => data.id,
                },
                /**
                    * Identifier of a user who is responsible for the job
                    * @name assignee
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Job
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                assignee: {
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
                /**
                    * @name status
                    * @type {module:API.cvat.enums.TaskStatus}
                    * @memberof module:API.cvat.classes.Job
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                status: {
                    get: () => data.status,
                    set: (status) => {
                        const type = window.cvat.enums.TaskStatus;
                        let valueInEnum = false;
                        for (const value in type) {
                            if (type[value] === status) {
                                valueInEnum = true;
                                break;
                            }
                        }

                        if (!valueInEnum) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a value from the enumeration cvat.enums.TaskStatus',
                            );
                        }

                        data.status = status;
                    },
                },
                /**
                    * @name startFrame
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Job
                    * @readonly
                    * @instance
                */
                startFrame: {
                    get: () => data.start_frame,
                },
                /**
                    * @name stopFrame
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Job
                    * @readonly
                    * @instance
                */
                stopFrame: {
                    get: () => data.stop_frame,
                },
                /**
                    * @name task
                    * @type {module:API.cvat.classes.Task}
                    * @memberof module:API.cvat.classes.Job
                    * @readonly
                    * @instance
                */
                task: {
                    get: () => data.task,
                },
            }));
        }

        /**
            * Method updates job data like status or assignee
            * @method save
            * @memberof module:API.cvat.classes.Job
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.ServerError}
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async save() {
            const result = await PluginRegistry
                .apiWrapper.call(this, Job.prototype.save);
            return result;
        }
    }


    /**
        * Class representing a task
        * @memberof module:API.cvat.classes
        * @extends Session
    */
    class Task extends Session {
        /**
            * In a fact you need use the constructor only if you want to create a task
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
            super();
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
                image_quality: undefined,
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

            Object.defineProperties(this, Object.freeze({
                /**
                    * @name id
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                id: {
                    get: () => data.id,
                },
                /**
                    * @name name
                    * @type {string}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                name: {
                    get: () => data.name,
                    set: (value) => {
                        if (!value.trim().length) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must not be empty',
                            );
                        }
                        data.name = value;
                    },
                },
                /**
                    * @name status
                    * @type {module:API.cvat.enums.TaskStatus}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                status: {
                    get: () => data.status,
                },
                /**
                    * @name size
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                size: {
                    get: () => data.size,
                },
                /**
                    * @name mode
                    * @type {TaskMode}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                mode: {
                    get: () => data.mode,
                },
                /**
                    * Identificator of a user who has created the task
                    * @name owner
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                owner: {
                    get: () => data.owner,
                },
                /**
                    * Identificator of a user who is responsible for the task
                    * @name assignee
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                assignee: {
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
                /**
                    * @name createdDate
                    * @type {string}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                createdDate: {
                    get: () => data.created_date,
                },
                /**
                    * @name updatedDate
                    * @type {string}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                updatedDate: {
                    get: () => data.updated_date,
                },
                /**
                    * @name bugTracker
                    * @type {string}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                bugTracker: {
                    get: () => data.bug_tracker,
                    set: (tracker) => {
                        data.bug_tracker = tracker;
                    },
                },
                /**
                    * @name overlap
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                overlap: {
                    get: () => data.overlap,
                    set: (overlap) => {
                        if (!Number.isInteger(overlap) || overlap < 0) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a non negative integer',
                            );
                        }
                        data.overlap = overlap;
                    },
                },
                /**
                    * @name segmentSize
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                segmentSize: {
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
                /**
                    * @name zOrder
                    * @type {boolean}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                zOrder: {
                    get: () => data.z_order,
                    set: (zOrder) => {
                        if (typeof (zOrder) !== 'boolean') {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a boolean',
                            );
                        }
                        data.z_order = zOrder;
                    },
                },
                /**
                    * @name imageQuality
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                imageQuality: {
                    get: () => data.image_quality,
                    set: (quality) => {
                        if (!Number.isInteger(quality) || quality < 0) {
                            throw new window.cvat.exceptions.ArgumentError(
                                'Value must be a positive integer',
                            );
                        }
                        data.image_quality = quality;
                    },
                },
                /**
                    * After task has been created value can be appended only.
                    * @name labels
                    * @type {module:API.cvat.classes.Label[]}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                labels: {
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
                /**
                    * @name jobs
                    * @type {module:API.cvat.classes.Job[]}
                    * @memberof module:API.cvat.classes.Task
                    * @readonly
                    * @instance
                */
                jobs: {
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
                    get: () => [...data.files.server_files],
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

                        Array.prototype.push.apply(data.files.server_files, serverFiles);
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
                    get: () => [...data.files.client_files],
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

                        Array.prototype.push.apply(data.files.client_files, clientFiles);
                    },
                },
                /**
                    * List of files from remote host
                    * @name remoteFiles
                    * @type {File[]}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                remoteFiles: {
                    get: () => [...data.files.remote_files],
                    set: (remoteFiles) => {
                        if (!Array.isArray(remoteFiles)) {
                            throw new window.cvat.exceptions.ArgumentError(
                                `Value must be an array. But ${typeof (remoteFiles)} has been got.`,
                            );
                        }

                        for (const value of remoteFiles) {
                            if (typeof (value) !== 'string') {
                                throw new window.cvat.exceptions.ArgumentError(
                                    `Array values must be a string. But ${typeof (value)} has been got.`,
                                );
                            }
                        }

                        Array.prototype.push.apply(data.files.remote_files, remoteFiles);
                    },
                },
            }));
        }

        /**
            * Method updates data of a created task or creates new task from scratch
            * @method save
            * @returns {module:API.cvat.classes.Task}
            * @memberof module:API.cvat.classes.Task
            * @param {function} [onUpdate] - the function which is used only if task hasn't
            * been created yet. It called in order to notify about creation status.
            * It receives the string parameter which is a status message
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.ServerError}
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async save(onUpdate = () => {}) {
            const result = await PluginRegistry
                .apiWrapper.call(this, Task.prototype.save, onUpdate);
            return result;
        }

        /**
            * Method deletes a task from a server
            * @method delete
            * @memberof module:API.cvat.classes.Task
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.ServerError}
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async delete() {
            const result = await PluginRegistry
                .apiWrapper.call(this, Task.prototype.delete);
            return result;
        }
    }

    module.exports = {
        Job,
        Task,
    };
})();
