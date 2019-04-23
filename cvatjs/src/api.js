/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
    global:false
*/

/**
    * External API which is should used for an integration
    * @module API
*/

(() => {
    const PluginRegistry = require('./plugins');
    const pjson = require('../package.json');
    const {
        ShareFileType,
        TaskStatus,
        TaskMode,
    } = require('./enums');

    const annotationsModule = {
        async upload(file) {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.upload, file);
            return result;
        },

        async save() {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.save);
            return result;
        },

        async clear() {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.clear);
            return result;
        },

        async dump() {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.dump);
            return result;
        },

        async statistics() {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.statistics);
            return result;
        },

        async put(arrayOfObjects = []) {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.put, arrayOfObjects);
            return result;
        },

        async get(frame, filter = {}) {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.get, frame, filter);
            return result;
        },

        async search(filter, frameFrom, frameTo) {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.search, filter, frameFrom, frameTo);
            return result;
        },

        async select(frame, x, y) {
            const result = await PluginRegistry
                .apiWrapper.call(this, annotationsModule.select, frame, x, y);
            return result;
        },
    };

    const framesModule = {
        async get(frame) {
            const result = await PluginRegistry
                .apiWrapper.call(this, framesModule.get, frame);
            return result;
        },
    };

    const logsModule = {
        async put(logType, details) {
            const result = await PluginRegistry
                .apiWrapper.call(this, logsModule.put, logType, details);
            return result;
        },
        async save() {
            const result = await PluginRegistry
                .apiWrapper.call(this, logsModule.save);
            return result;
        },
    };

    const actionsModule = {
        async undo(count) {
            const result = await PluginRegistry
                .apiWrapper.call(this, actionsModule.undo, count);
            return result;
        },
        async redo(count) {
            const result = await PluginRegistry
                .apiWrapper.call(this, actionsModule.redo, count);
            return result;
        },
        async clear() {
            const result = await PluginRegistry
                .apiWrapper.call(this, actionsModule.clear);
            return result;
        },
    };

    const eventsModule = {
        async subscribe(eventType, callback) {
            const result = await PluginRegistry
                .apiWrapper.call(this, eventsModule.subscribe, eventType, callback);
            return result;
        },
        async unsubscribe(eventType, callback = null) {
            const result = await PluginRegistry
                .apiWrapper.call(this, eventsModule.unsubscribe, eventType, callback);
            return result;
        },
    };

    /**
        * API entrypoint
        * @namespace cvat
        * @memberof module:API
    */
    const cvat = {
        /**
            * Namespace is used for an interaction with a server
            * @namespace server
            * @memberof module:API.cvat
        */
        server: {
            /**
                * @typedef {Object} ServerInfo
                * @property {string} name A name of the tool [ReadOnly]
                * @property {string} description A description of the tool [ReadOnly]
                * @property {string} version A version of the tool [ReadOnly]
                * @global
            */

            /**
                * Method returns some information about the annotation tool
                * @method about
                * @async
                * @memberof module:API.cvat.server
                * @return {ServerInfo}
            */
            async about() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.about);
                return result;
            },
            /**
                * @typedef {Object} FileInfo
                * @property {string} name A name of a file [ReadOnly]
                * @property {module:API.cvat.enums.ShareFileType} type
                * A type of a file 'DIR' or 'REG' [ReadOnly]
                * @global
            */

            /**
                * Method returns a list of files in a specified directory on a share
                * @method share
                * @async
                * @memberof module:API.cvat.server
                * @param {string} [directory=/] - Share directory path
                * @returns {FileInfo[]}
            */
            async share(directory = '/') {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.share, directory);
                return result;
            },
            /**
                * Method allows to login on a server
                * @method login
                * @async
                * @memberof module:API.cvat.server
                * @param {string} username An username of an account
                * @param {string} password A password of an account
            */
            async login(username, password) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.login, username, password);
                return result;
            },
        },
        /**
            * Namespace is used for getting tasks
            * @namespace tasks
            * @memberof module:API.cvat
        */
        tasks: {
            /**
                * @typedef {Object} TaskFilter
                * @property {string} name Check if name contains this value
                * @property {module:API.cvat.enums.TaskStatus} status
                * Check if status contains this value
                * @property {module:API.cvat.enums.TaskMode} mode
                * Check if mode contains this value
                * @property {string} id Check if id equals this value
                * @property {string} owner Check if owner user contains this value
                * @property {string} assignee Check if assigneed contains this value
                * @property {string} search Combined search of contains among all fields
                * @global
            */

            /**
                * Method returns list of tasks corresponding to a filter
                * @method get
                * @async
                * @memberof module:API.cvat.tasks
                * @param {TaskFilter} [filter={}] task filter
                * @returns {Task[]}
            */
            async get(filter = {}) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.tasks.get, filter);
                return result;
            },
        },
        /**
            * Namespace is used for getting jobs
            * @namespace jobs
            * @memberof module:API.cvat
        */
        jobs: {
            /**
                * @typedef {Object} JobFilter
                * @property {integer} taskID filter all jobs of specific task
                * @property {integer} jobID filter job with a specific id
                * @global
            */

            /**
                * Method returns list of jobs corresponding to a filter
                * @method get
                * @async
                * @memberof module:API.cvat.jobs
                * @param {JobFilter} filter job filter
                * @returns {Job[]}
            */
            async get(filter) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.jobs.get, filter);
                return result;
            },
        },
        /**
            * Namespace is used for getting users
            * @namespace users
            * @memberof module:API.cvat
        */
        users: {
            /**
                * @typedef {Object} UserFilter
                * @property {boolean} self get only self
                * @global
            */

            /**
                * Method returns list of users corresponding to a filter
                * @method get
                * @async
                * @memberof module:API.cvat.users
                * @param {UserFilter} [filter={}] user filter
                * @returns {User[]}
            */
            async get(filter = {}) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.users.get, filter);
                return result;
            },
        },
        /**
            * Namespace is used for plugin management
            * @namespace plugins
            * @memberof module:API.cvat
        */
        plugins: {
            async list() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.plugins.list);
                return result;
            },
            async register() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.plugins.register);
                return result;
            },
        },
        /**
            * Namespace contains some changeable configurations
            * @namespace config
            * @memberof module:API.cvat
        */
        config: {
            host: 'http://localhost:7000',
            api: 'v1',
            proxy: false,
        },
        /**
            * Namespace contains some library information e.g. api version
            * @namespace client
            * @memberof module:API.cvat
        */
        client: {
            /**
                * Format <b>{major}.{minor}.{patch}</b>
                * <p> <li> A major number is changed after an API becomes
                * incompatible with a previous version
                * <p> <li> A minor number is changed after an API expands
                * <p> <li> A patch number is changed after an each build
                * @property {string} version client version
                * @memberof module:API.cvat.client
            */
            version: `${pjson.version}`,
        },
        /**
            * Namespace is used for access to enums
            * @namespace enums
            * @memberof module:API.cvat
        */
        enums: {
            ShareFileType,
            TaskStatus,
            TaskMode,
        },
        Job: {
            async save() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.Job.save);
                return result;
            },
            annotations: Object.freeze(annotationsModule),
            frames: Object.freeze(framesModule),
            logs: Object.freeze(logsModule),
            actions: Object.freeze(actionsModule),
            events: Object.freeze(eventsModule),
        },
        Task: {
            async delete() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.Task.delete);
                return result;
            },
            async save() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.Task.save);
                return result;
            },
            annotations: Object.freeze(annotationsModule),
            frames: Object.freeze(framesModule),
            logs: Object.freeze(logsModule),
            actions: Object.freeze(actionsModule),
            events: Object.freeze(eventsModule),
        },
    };

    cvat.server = Object.freeze(cvat.server);
    cvat.tasks = Object.freeze(cvat.tasks);
    cvat.jobs = Object.freeze(cvat.jobs);
    cvat.users = Object.freeze(cvat.users);
    cvat.plugins = Object.freeze(cvat.plugins);
    cvat.client = Object.freeze(cvat.client);
    cvat.enums = Object.freeze(cvat.enums);
    cvat.Job = Object.freeze(cvat.Job);
    cvat.Task = Object.freeze(cvat.Task);

    const implementation = require('./api-implementation');
    global.cvat = Object.freeze(implementation(cvat));
})();

// TODO: Plugins installation
