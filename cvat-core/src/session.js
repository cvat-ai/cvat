/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const { getFrame } = require('./frames');
    const { ArgumentError } = require('./exceptions');
    const { TaskStatus } = require('./enums');
    const { Label } = require('./labels');

    function buildDublicatedAPI(prototype) {
        Object.defineProperties(prototype, {
            annotations: Object.freeze({
                value: {
                    async upload(file, loader) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.upload, file, loader);
                        return result;
                    },

                    async save() {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.save);
                        return result;
                    },

                    async clear(reload = false) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.clear, reload);
                        return result;
                    },

                    async dump(name, dumper) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.dump, name, dumper);
                        return result;
                    },

                    async statistics() {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.statistics);
                        return result;
                    },

                    async put(arrayOfObjects = []) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.put, arrayOfObjects);
                        return result;
                    },

                    async get(frame, filter = {}) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.get, frame, filter);
                        return result;
                    },

                    async search(filter, frameFrom, frameTo) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.search,
                                filter, frameFrom, frameTo);
                        return result;
                    },

                    async select(objectStates, x, y) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this,
                                prototype.annotations.select, objectStates, x, y);
                        return result;
                    },

                    async hasUnsavedChanges() {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.hasUnsavedChanges);
                        return result;
                    },

                    async merge(objectStates) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.merge, objectStates);
                        return result;
                    },

                    async split(objectState, frame) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.split, objectState, frame);
                        return result;
                    },

                    async group(objectStates, reset = false) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.annotations.group,
                                objectStates, reset);
                        return result;
                    },
                },
                writable: true,
            }),
            frames: Object.freeze({
                value: {
                    async get(frame) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.frames.get, frame);
                        return result;
                    },
                },
                writable: true,
            }),
            logs: Object.freeze({
                value: {
                    async put(logType, details) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.logs.put, logType, details);
                        return result;
                    },
                    async save(onUpdate) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.logs.save, onUpdate);
                        return result;
                    },
                },
                writable: true,
            }),
            actions: Object.freeze({
                value: {
                    async undo(count) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.actions.undo, count);
                        return result;
                    },
                    async redo(count) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.actions.redo, count);
                        return result;
                    },
                    async clear() {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.actions.clear);
                        return result;
                    },
                },
                writable: true,
            }),
            events: Object.freeze({
                value: {
                    async subscribe(evType, callback) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.events.subscribe, evType, callback);
                        return result;
                    },
                    async unsubscribe(evType, callback = null) {
                        const result = await PluginRegistry
                            .apiWrapper.call(this, prototype.events.unsubscribe, evType, callback);
                        return result;
                    },
                },
                writable: true,
            }),
        });
    }

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
                * You need upload annotations from a server again after successful executing
                * @method upload
                * @memberof Session.annotations
                * @param {File} annotations - a text file with annotations
                * @param {module:API.cvat.classes.Loader} loader - a loader
                * which will be used to upload
                * @instance
                * @async
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
            */
            /**
                * Save all changes in annotations on a server
                * Objects which hadn't been saved on a server before,
                * get a serverID after saving. But received object states aren't updated.
                * So, after successful saving it's recommended to update them manually
                * (call the annotations.get() again)
                * @method save
                * @memberof Session.annotations
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @instance
                * @async
                * @param {function} [onUpdate] saving can be long.
                * This callback can be used to notify a user about current progress
                * Its argument is a text string
            */
            /**
                * Remove all annotations and optionally reinitialize it
                * @method clear
                * @memberof Session.annotations
                * @param {boolean} [reload = false] reset all changes and
                * reinitialize annotations by data from a server
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @instance
                * @async
            */
            /**
                * Dump of annotations to a file.
                * Method always dumps annotations for a whole task.
                * @method dump
                * @memberof Session.annotations
                * @param {string} name - a name of a file with annotations
                * @param {module:API.cvat.classes.Dumper} dumper - a dumper
                * which will be used to dump
                * @returns {string} URL which can be used in order to get a dump file
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
            /**
                * Collect short statistics about a task or a job.
                * @method statistics
                * @memberof Session.annotations
                * @returns {module:API.cvat.classes.Statistics} statistics object
                * @throws {module:API.cvat.exceptions.PluginError}
                * @instance
                * @async
            */
            /**
                * Create new objects from one-frame states
                * After successful adding you need to update object states on a frame
                * @method put
                * @memberof Session.annotations
                * @param {module:API.cvat.classes.ObjectState[]} data
                * array of objects on the specific frame
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.DataError}
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
                * Select shape under a cursor by using minimal distance
                * between a cursor and a shape edge or a shape point
                * For closed shapes a cursor is placed inside a shape
                * @method select
                * @memberof Session.annotations
                * @param {module:API.cvat.classes.ObjectState[]} objectStates
                * objects which can be selected
                * @param {float} x horizontal coordinate
                * @param {float} y vertical coordinate
                * @returns {Object}
                * a pair of {state: ObjectState, distance: number} for selected object.
                * Pair values can be null if there aren't any sutisfied objects
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
            /**
                * Method unites several shapes and tracks into the one
                * All shapes must be the same (rectangle, polygon, etc)
                * All labels must be the same
                * After successful merge you need to update object states on a frame
                * @method merge
                * @memberof Session.annotations
                * @param {module:API.cvat.classes.ObjectState[]} objectStates
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @instance
                * @async
            */
            /**
                * Method splits a track into two parts
                * (start frame: previous frame), (frame, last frame)
                * After successful split you need to update object states on a frame
                * @method split
                * @memberof Session.annotations
                * @param {module:API.cvat.classes.ObjectState} objectState
                * @param {integer} frame
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @instance
                * @async
            */
            /**
                * Method creates a new group and put all passed objects into it
                * After successful split you need to update object states on a frame
                * @method group
                * @memberof Session.annotations
                * @param {module:API.cvat.classes.ObjectState[]} objectStates
                * @param {boolean} reset pass "true" to reset group value (set it to 0)
                * @returns {integer} an ID of created group
                * @throws {module:API.cvat.exceptions.ArgumentError}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @instance
                * @async
            */
            /**
                * Indicate if there are any changes in
                * annotations which haven't been saved on a server
                * @method hasUnsavedChanges
                * @memberof Session.annotations
                * @returns {boolean}
                * @throws {module:API.cvat.exceptions.PluginError}
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
                        throw new ArgumentError(
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
                            throw new ArgumentError(
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
                        const type = TaskStatus;
                        let valueInEnum = false;
                        for (const value in type) {
                            if (type[value] === status) {
                                valueInEnum = true;
                                break;
                            }
                        }

                        if (!valueInEnum) {
                            throw new ArgumentError(
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

            // When we call a function, for example: task.annotations.get()
            // In the method get we lose the task context
            // So, we need return it
            this.annotations = {
                get: Object.getPrototypeOf(this).annotations.get.bind(this),
                put: Object.getPrototypeOf(this).annotations.put.bind(this),
                save: Object.getPrototypeOf(this).annotations.save.bind(this),
                dump: Object.getPrototypeOf(this).annotations.dump.bind(this),
                merge: Object.getPrototypeOf(this).annotations.merge.bind(this),
                split: Object.getPrototypeOf(this).annotations.split.bind(this),
                group: Object.getPrototypeOf(this).annotations.group.bind(this),
                clear: Object.getPrototypeOf(this).annotations.clear.bind(this),
                upload: Object.getPrototypeOf(this).annotations.upload.bind(this),
                select: Object.getPrototypeOf(this).annotations.select.bind(this),
                statistics: Object.getPrototypeOf(this).annotations.statistics.bind(this),
                hasUnsavedChanges: Object.getPrototypeOf(this)
                    .annotations.hasUnsavedChanges.bind(this),
            };

            this.frames = {
                get: Object.getPrototypeOf(this).frames.get.bind(this),
            };
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
                start_frame: undefined,
                stop_frame: undefined,
                frame_filter: undefined,
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
                            const jobInstance = new Job({
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
                    const classInstance = new Label(label);
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
                            throw new ArgumentError(
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
                            throw new ArgumentError(
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
                            throw new ArgumentError(
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
                            throw new ArgumentError(
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
                            throw new ArgumentError(
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
                            throw new ArgumentError(
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
                            throw new ArgumentError(
                                'Value must be an array of Labels',
                            );
                        }

                        for (const label of labels) {
                            if (!(label instanceof Label)) {
                                throw new ArgumentError(
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
                            throw new ArgumentError(
                                `Value must be an array. But ${typeof (serverFiles)} has been got.`,
                            );
                        }

                        for (const value of serverFiles) {
                            if (typeof (value) !== 'string') {
                                throw new ArgumentError(
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
                            throw new ArgumentError(
                                `Value must be an array. But ${typeof (clientFiles)} has been got.`,
                            );
                        }

                        for (const value of clientFiles) {
                            if (!(value instanceof File)) {
                                throw new ArgumentError(
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
                            throw new ArgumentError(
                                `Value must be an array. But ${typeof (remoteFiles)} has been got.`,
                            );
                        }

                        for (const value of remoteFiles) {
                            if (typeof (value) !== 'string') {
                                throw new ArgumentError(
                                    `Array values must be a string. But ${typeof (value)} has been got.`,
                                );
                            }
                        }

                        Array.prototype.push.apply(data.files.remote_files, remoteFiles);
                    },
                },
                /**
                    * The first frame of a video to annotation
                    * @name startFrame
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                startFrame: {
                    get: () => data.start_frame,
                    set: (frame) => {
                        if (!Number.isInteger(frame) || frame < 0) {
                            throw new ArgumentError(
                                'Value must be a not negative integer',
                            );
                        }
                        data.start_frame = frame;
                    },
                },
                /**
                    * The last frame of a video to annotation
                    * @name stopFrame
                    * @type {integer}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                stopFrame: {
                    get: () => data.stop_frame,
                    set: (frame) => {
                        if (!Number.isInteger(frame) || frame < 0) {
                            throw new ArgumentError(
                                'Value must be a not negative integer',
                            );
                        }
                        data.stop_frame = frame;
                    },
                },
                /**
                    * Filter to ignore some frames during task creation
                    * @name frameFilter
                    * @type {string}
                    * @memberof module:API.cvat.classes.Task
                    * @instance
                    * @throws {module:API.cvat.exceptions.ArgumentError}
                */
                frameFilter: {
                    get: () => data.frame_filter,
                    set: (filter) => {
                        if (typeof (filter) !== 'string') {
                            throw new ArgumentError(
                                `Filter value must be a string. But ${typeof (filter)} has been got.`,
                            );
                        }

                        data.frame_filter = filter;
                    },
                },
            }));

            // When we call a function, for example: task.annotations.get()
            // In the method get we lose the task context
            // So, we need return it
            this.annotations = {
                get: Object.getPrototypeOf(this).annotations.get.bind(this),
                put: Object.getPrototypeOf(this).annotations.put.bind(this),
                save: Object.getPrototypeOf(this).annotations.save.bind(this),
                dump: Object.getPrototypeOf(this).annotations.dump.bind(this),
                merge: Object.getPrototypeOf(this).annotations.merge.bind(this),
                split: Object.getPrototypeOf(this).annotations.split.bind(this),
                group: Object.getPrototypeOf(this).annotations.group.bind(this),
                clear: Object.getPrototypeOf(this).annotations.clear.bind(this),
                upload: Object.getPrototypeOf(this).annotations.upload.bind(this),
                select: Object.getPrototypeOf(this).annotations.select.bind(this),
                statistics: Object.getPrototypeOf(this).annotations.statistics.bind(this),
                hasUnsavedChanges: Object.getPrototypeOf(this)
                    .annotations.hasUnsavedChanges.bind(this),
            };

            this.frames = {
                get: Object.getPrototypeOf(this).frames.get.bind(this),
            };
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

    const {
        getAnnotations,
        putAnnotations,
        saveAnnotations,
        hasUnsavedChanges,
        mergeAnnotations,
        splitAnnotations,
        groupAnnotations,
        clearAnnotations,
        selectObject,
        annotationsStatistics,
        uploadAnnotations,
        dumpAnnotations,
    } = require('./annotations');

    buildDublicatedAPI(Job.prototype);
    buildDublicatedAPI(Task.prototype);

    Job.prototype.save.implementation = async function () {
        // TODO: Add ability to change an assignee
        if (this.id) {
            const jobData = {
                status: this.status,
            };

            await serverProxy.jobs.saveJob(this.id, jobData);
            return this;
        }

        throw new ArgumentError(
            'Can not save job without and id',
        );
    };

    Job.prototype.frames.get.implementation = async function (frame) {
        if (!Number.isInteger(frame) || frame < 0) {
            throw new ArgumentError(
                `Frame must be a positive integer. Got: "${frame}"`,
            );
        }

        if (frame < this.startFrame || frame > this.stopFrame) {
            throw new ArgumentError(
                `The frame with number ${frame} is out of the job`,
            );
        }

        const frameData = await getFrame(this.task.id, this.task.mode, frame);
        return frameData;
    };

    // TODO: Check filter for annotations
    Job.prototype.annotations.get.implementation = async function (frame, filter) {
        if (frame < this.startFrame || frame > this.stopFrame) {
            throw new ArgumentError(
                `Frame ${frame} does not exist in the job`,
            );
        }

        const annotationsData = await getAnnotations(this, frame, filter);
        return annotationsData;
    };

    Job.prototype.annotations.save.implementation = async function (onUpdate) {
        const result = await saveAnnotations(this, onUpdate);
        return result;
    };

    Job.prototype.annotations.merge.implementation = async function (objectStates) {
        const result = await mergeAnnotations(this, objectStates);
        return result;
    };

    Job.prototype.annotations.split.implementation = async function (objectState, frame) {
        const result = await splitAnnotations(this, objectState, frame);
        return result;
    };

    Job.prototype.annotations.group.implementation = async function (objectStates, reset) {
        const result = await groupAnnotations(this, objectStates, reset);
        return result;
    };

    Job.prototype.annotations.hasUnsavedChanges.implementation = function () {
        const result = hasUnsavedChanges(this);
        return result;
    };

    Job.prototype.annotations.clear.implementation = async function (reload) {
        const result = await clearAnnotations(this, reload);
        return result;
    };

    Job.prototype.annotations.select.implementation = function (frame, x, y) {
        const result = selectObject(this, frame, x, y);
        return result;
    };

    Job.prototype.annotations.statistics.implementation = function () {
        const result = annotationsStatistics(this);
        return result;
    };

    Job.prototype.annotations.put.implementation = function (objectStates) {
        const result = putAnnotations(this, objectStates);
        return result;
    };

    Job.prototype.annotations.upload.implementation = async function (file, loader) {
        const result = await uploadAnnotations(this, file, loader);
        return result;
    };

    Job.prototype.annotations.dump.implementation = async function (name, dumper) {
        const result = await dumpAnnotations(this, name, dumper);
        return result;
    };

    Task.prototype.save.implementation = async function saveTaskImplementation(onUpdate) {
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

        if (typeof (this.bugTracker) !== 'undefined') {
            taskData.bug_tracker = this.bugTracker;
        }
        if (typeof (this.segmentSize) !== 'undefined') {
            taskData.segment_size = this.segmentSize;
        }
        if (typeof (this.overlap) !== 'undefined') {
            taskData.overlap = this.overlap;
        }
        if (typeof (this.startFrame) !== 'undefined') {
            taskData.start_frame = this.startFrame;
        }
        if (typeof (this.stopFrame) !== 'undefined') {
            taskData.stop_frame = this.stopFrame;
        }
        if (typeof (this.frameFilter) !== 'undefined') {
            taskData.frame_filter = this.frameFilter;
        }

        const taskFiles = {
            client_files: this.clientFiles,
            server_files: this.serverFiles,
            remote_files: this.remoteFiles,
        };

        const task = await serverProxy.tasks.createTask(taskData, taskFiles, onUpdate);
        return new Task(task);
    };

    Task.prototype.delete.implementation = async function () {
        const result = await serverProxy.tasks.deleteTask(this.id);
        return result;
    };

    Task.prototype.frames.get.implementation = async function (frame) {
        if (!Number.isInteger(frame) || frame < 0) {
            throw new ArgumentError(
                `Frame must be a positive integer. Got: "${frame}"`,
            );
        }

        if (frame >= this.size) {
            throw new ArgumentError(
                `The frame with number ${frame} is out of the task`,
            );
        }

        const result = await getFrame(this.id, this.mode, frame);
        return result;
    };

    // TODO: Check filter for annotations
    Task.prototype.annotations.get.implementation = async function (frame, filter) {
        if (!Number.isInteger(frame) || frame < 0) {
            throw new ArgumentError(
                `Frame must be a positive integer. Got: "${frame}"`,
            );
        }

        if (frame >= this.size) {
            throw new ArgumentError(
                `Frame ${frame} does not exist in the task`,
            );
        }

        const result = await getAnnotations(this, frame, filter);
        return result;
    };

    Task.prototype.annotations.save.implementation = async function (onUpdate) {
        const result = await saveAnnotations(this, onUpdate);
        return result;
    };

    Task.prototype.annotations.merge.implementation = async function (objectStates) {
        const result = await mergeAnnotations(this, objectStates);
        return result;
    };

    Task.prototype.annotations.split.implementation = async function (objectState, frame) {
        const result = await splitAnnotations(this, objectState, frame);
        return result;
    };

    Task.prototype.annotations.group.implementation = async function (objectStates, reset) {
        const result = await groupAnnotations(this, objectStates, reset);
        return result;
    };

    Task.prototype.annotations.hasUnsavedChanges.implementation = function () {
        const result = hasUnsavedChanges(this);
        return result;
    };

    Task.prototype.annotations.clear.implementation = async function (reload) {
        const result = await clearAnnotations(this, reload);
        return result;
    };

    Task.prototype.annotations.select.implementation = function (frame, x, y) {
        const result = selectObject(this, frame, x, y);
        return result;
    };

    Task.prototype.annotations.statistics.implementation = function () {
        const result = annotationsStatistics(this);
        return result;
    };

    Task.prototype.annotations.put.implementation = function (objectStates) {
        const result = putAnnotations(this, objectStates);
        return result;
    };

    Task.prototype.annotations.upload.implementation = async function (file, loader) {
        const result = await uploadAnnotations(this, file, loader);
        return result;
    };

    Task.prototype.annotations.dump.implementation = async function (name, dumper) {
        const result = await dumpAnnotations(this, name, dumper);
        return result;
    };
})();
