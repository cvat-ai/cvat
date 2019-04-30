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
    const User = require('./user');
    const Task = require('./task');
    const Job = require('./job');
    const { Attribute, Label } = require('./labels');

    const {
        ShareFileType,
        TaskStatus,
        TaskMode,
    } = require('./enums');

    const {
        Exception,
        ArgumentError,
        ScriptingError,
        PluginError,
        ServerError,
    } = require('./exceptions');

    const pjson = require('../package.json');

    function buildDublicatedAPI() {
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

        return {
            annotationsModule,
            framesModule,
            logsModule,
            actionsModule,
            eventsModule,
        };
    }

    // Two copies of API for Task and for Job
    const jobAPI = buildDublicatedAPI();
    const taskAPI = buildDublicatedAPI();

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
                * @property {string} name A name of the tool
                * @property {string} description A description of the tool
                * @property {string} version A version of the tool
                * @global
            */

            /**
                * Method returns some information about the annotation tool
                * @method about
                * @async
                * @memberof module:API.cvat.server
                * @return {ServerInfo}
                * @throws {module:API.cvat.exceptions.ServerError}
                * @throws {module:API.cvat.exceptions.PluginError}
            */
            async about() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.about);
                return result;
            },
            /**
                * @typedef {Object} FileInfo
                * @property {string} name A name of a file
                * @property {module:API.cvat.enums.ShareFileType} type
                * A type of a file
                * @global
            */

            /**
                * Method returns a list of files in a specified directory on a share
                * @method share
                * @async
                * @memberof module:API.cvat.server
                * @param {string} [directory=/] - Share directory path
                * @returns {FileInfo[]}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
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
                * @throws {module:API.cvat.exceptions.ScriptingError}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
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
                * @property {integer} id Check if id equals this value
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
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
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
                * Only one of fields is allowed simultaneously
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
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async get(filter = {}) {
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
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
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
            /**
                * @typedef {Object} Plugin
                * A plugin is a Javascript object. It must have properties are listed below. <br>
                * It also mustn't have property 'functions' which is used internally. <br>
                * You can expand any API method including class methods. <br>
                * In order to expand class method just use a class name
                * in a cvat space (example is listed below).
                *
                * @property {string} name A name of a plugin
                * @property {string} description A description of a plugin
                * Example plugin implementation listed below:
                * @example
                * plugin = {
                *   name: 'Example Plugin',
                *   description: 'This example plugin demonstrates how plugin system in CVAT works',
                *   cvat: {
                *     server: {
                *       about: {
                *         // Plugin adds some actions after executing the cvat.server.about()
                *         // For example it adds a field with installed plugins to a result
                *         // An argument "self" is a plugin itself
                *         // An argument "result" is a return value of cvat.server.about()
                *         // All next arguments are arguments of a wrapped function
                *         // (in this case the wrapped function doesn't have any arguments)
                *         async leave(self, result) {
                *           result.plugins = await self.internal.getPlugins();
                *           // Note that a method leave must return "result" (changed or not)
                *           // Otherwise API won't work as expected
                *           return result;
                *         },
                *       },
                *     },
                *     // In this example plugin also wraps a class method
                *     Job: {
                *       annotations: {
                *         put: {
                *           // The first argument "self" is a plugin, like in a case above
                *           // The second argument is an argument of the cvat.Job.annotations.put()
                *           // It contains an array of objects to put
                *           // In this sample we round objects coordinates and save them
                *           enter(self, objects) {
                *             for (const obj of objects) {
                *               if (obj.type != 'tag') {
                *                 const points = obj.position.map((point) => {
                *                    const roundPoint = {
                *                      x: Math.round(point.x),
                *                      y: Math.round(point.y),
                *                    };
                *                    return roundPoint;
                *                 });
                *               }
                *             }
                *           },
                *         },
                *       },
                *     }
                *   },
                *   // In general you can add any others members to your plugin
                *   // Members below are only examples
                *   internal: {
                *     async getPlugins() {
                *       // Collect information about installed plugins
                *       const plugins = await global.cvat.plugins.list();
                *       return plugins.map((el) => {
                *         return {
                *           name: el.name,
                *           description: el.description,
                *         };
                *       });
                *     },
                *   },
                * };
                * @global
            */

            /**
                * Method returns list of installed plugins
                * @method list
                * @async
                * @memberof module:API.cvat.plugins
                * @returns {Plugin[]}
                * @throws {module:API.cvat.exceptions.PluginError}
            */
            async list() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.plugins.list);
                return result;
            },
            /**
                * Install plugin to CVAT
                * @method register
                * @async
                * @memberof module:API.cvat.plugins
                * @param {Plugin} [plugin] plugin for registration
                * @throws {module:API.cvat.exceptions.PluginError}
            */
            async register(plugin) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.plugins.register, plugin);
                return result;
            },
        },
        /**
            * Namespace contains some changeable configurations
            * @namespace config
            * @memberof module:API.cvat
        */
        config: {
            /**
                * @property {string} backendAPI host with a backend api
                * @memberof module:API.cvat.config
                * @property {string} proxy Axios proxy settings.
                * For more details please read <a href="https://github.com/axios/axios"> here </a>
                * @memberof module:API.cvat.config
                * @property {number} preloadFrames the number of subsequent frames which are
                * loaded in background
                * @memberof module:API.cvat.config
            */
            preloadFrames: 300,
            backendAPI: 'http://localhost:7000/api/v1',
            proxy: false,
        },
        /**
            * Namespace contains some library information e.g. api version
            * @namespace client
            * @memberof module:API.cvat
        */
        client: {
            /**
                * @property {string} version Client version.
                * Format: <b>{major}.{minor}.{patch}</b>
                * <li style="margin-left: 10px;"> A major number is changed after an API becomes
                * incompatible with a previous version
                * <li style="margin-left: 10px;"> A minor number is changed after an API expands
                * <li style="margin-left: 10px;"> A patch number is changed after an each build
                * @memberof module:API.cvat.client
                * @readonly
            */
            version: `${pjson.version}`,
        },
        /**
            * Namespace is used for access to enums
            * @namespace enums
            * @memberof module:API.cvat
        */
        enums: {
            /**
                * Enum for type of server files
                * @enum {string}
                * @name ShareFileType
                * @memberof module:API.cvat.enums
                * @property {string} DIR - directory
                * @property {string} REG - regular file
                * @readonly
            */
            ShareFileType,
            /**
                * Enum for a status of a task
                * @enum {string}
                * @name TaskStatus
                * @memberof module:API.cvat.enums
                * @property {string} ANNOTATION - task is being annotated
                * @property {string} VALIDATION - task is being validated
                * @property {string} COMPLETED - task has been done
                * @readonly
            */
            TaskStatus,
            /**
                * Enum for a mode of a task
                * @enum {string}
                * @name TaskMode
                * @memberof module:API.cvat.enums
                * @property {string} ANNOTATION - images annotation task
                * @property {string} INTERPOLATION - video annotation task
                * @readonly
            */
            TaskMode,
        },
        /**
            * Namespace is used for access to exceptions
            * @namespace exceptions
            * @memberof module:API.cvat
        */
        exceptions: {
            Exception,
            ArgumentError,
            ScriptingError,
            PluginError,
            ServerError,
        },
        /**
            * Namespace is used for access to classes
            * @namespace classes
            * @memberof module:API.cvat
        */
        classes: {
            User,
            Task,
            Job,
            Attribute,
            Label,
        },
        Job: {
            async save() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.Job.save);
                return result;
            },
            annotations: Object.freeze(jobAPI.annotationsModule),
            frames: Object.freeze(jobAPI.framesModule),
            logs: Object.freeze(jobAPI.logsModule),
            actions: Object.freeze(jobAPI.actionsModule),
            events: Object.freeze(jobAPI.eventsModule),
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
            annotations: Object.freeze(taskAPI.annotationsModule),
            frames: Object.freeze(taskAPI.framesModule),
            logs: Object.freeze(taskAPI.logsModule),
            actions: Object.freeze(taskAPI.actionsModule),
            events: Object.freeze(taskAPI.eventsModule),
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

    const implementAPI = require('./api-implementation');
    global.cvat = Object.freeze(implementAPI(cvat));

    const hidden = require('./hidden');
    hidden.location = cvat.config.backendAPI.slice(0, -7); // TODO: Use JS server instead
})();

const plugin = {
    name: 'Example Plugin',
    description: 'This example plugin demonstrates how plugin system in CVAT works',
    cvat: {
        server: {
            about: {
                async leave(self, result) {
                    result.plugins = await self.internal.getPlugins();
                    return result;
                },
            },
        },
        Job: {
            annotations: {
                put: {
                    enter(self, objects) {
                        for (const obj of objects) {
                            if (obj.type !== 'tag') {
                                const points = obj.position.map((point) => {
                                    const roundPoint = {
                                        x: Math.round(point.x),
                                        y: Math.round(point.y),
                                    };
                                    return roundPoint;
                                });
                                obj.points = points;
                            }
                        }
                    },
                },
            },
        },
    },
    internal: {
        async getPlugins() {
            const plugins = await global.cvat.plugins.list();
            return plugins.map((el) => {
                const obj = {
                    name: el.name,
                    description: el.description,
                };
                return obj;
            });
        },
    },
};


(async function test() {
    await global.cvat.plugins.register(plugin);
    await global.cvat.server.login('admin', 'nimda760');

    try {
        console.log(JSON.stringify(await global.cvat.server.about()));
        console.log(await global.cvat.users.get({ self: false }));
        console.log(await global.cvat.users.get({ self: true }));
        console.log(JSON.stringify(await global.cvat.jobs.get({ taskID: 8 })));
        console.log(JSON.stringify(await global.cvat.jobs.get({ jobID: 10 })));
        console.log(await global.cvat.tasks.get());
        console.log(await global.cvat.tasks.get({ id: 8 }));
        console.log('Done.');
    } catch (exception) {
        console.log(typeof (exception));
        console.log(exception.message);
    }
}());
