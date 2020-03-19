/*
* Copyright (C) 2019-2020 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

/**
    * External API which should be used by for development
    * @module API
*/

function build() {
    const PluginRegistry = require('./plugins');
    const loggerStorage = require('./logger-storage');
    const Log = require('./log');
    const ObjectState = require('./object-state');
    const Statistics = require('./statistics');
    const { Job, Task } = require('./session');
    const { Attribute, Label } = require('./labels');

    const {
        ShareFileType,
        TaskStatus,
        TaskMode,
        AttributeType,
        ObjectType,
        ObjectShape,
        LogType,
        HistoryActions,
        colors,
    } = require('./enums');

    const {
        Exception,
        ArgumentError,
        DataError,
        ScriptingError,
        PluginError,
        ServerError,
    } = require('./exceptions');

    const User = require('./user');
    const pjson = require('../package.json');
    const config = require('./config');

    /**
        * API entrypoint
        * @namespace cvat
        * @memberof module:API
    */
    const cvat = {
        /**
            * Namespace is used for an interaction with a server
            * @namespace server
            * @package
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
                * Method returns available annotation formats
                * @method formats
                * @async
                * @memberof module:API.cvat.server
                * @returns {module:API.cvat.classes.AnnotationFormat[]}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async formats() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.formats);
                return result;
            },
            /**
                * Method returns available dataset export formats
                * @method exportFormats
                * @async
                * @memberof module:API.cvat.server
                * @returns {module:String[]}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async datasetFormats() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.datasetFormats);
                return result;
            },
            /**
                * Method allows to register on a server
                * @method register
                * @async
                * @memberof module:API.cvat.server
                * @param {string} username An username for the new account
                * @param {string} firstName A first name for the new account
                * @param {string} lastName A last name for the new account
                * @param {string} email A email address for the new account
                * @param {string} password1 A password for the new account
                * @param {string} password2 The confirmation password for the new account
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async register(username, firstName, lastName, email, password1, password2) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.register, username, firstName,
                        lastName, email, password1, password2);
                return result;
            },
            /**
                * Method allows to login on a server
                * @method login
                * @async
                * @memberof module:API.cvat.server
                * @param {string} username An username of an account
                * @param {string} password A password of an account
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async login(username, password) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.login, username, password);
                return result;
            },
            /**
                * Method allows to logout from the server
                * @method logout
                * @async
                * @memberof module:API.cvat.server
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async logout() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.logout);
                return result;
            },
            /**
                * Method allows to know whether you are authorized on the server
                * @method authorized
                * @async
                * @memberof module:API.cvat.server
                * @returns {boolean}
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async authorized() {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.authorized);
                return result;
            },
            /**
                * Method allows to do requests via cvat-core with authorization headers
                * @method request
                * @async
                * @memberof module:API.cvat.server
                * @param {string} url
                * @param {Object} data request parameters: method, headers, data, etc.
                * @returns {Object | undefined} response data if exist
                * @throws {module:API.cvat.exceptions.PluginError}
                * @throws {module:API.cvat.exceptions.ServerError}
            */
            async request(url, data) {
                const result = await PluginRegistry
                    .apiWrapper(cvat.server.request, url, data);
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
                * @property {integer} page Get specific page
                * (default REST API returns 20 tasks per request.
                * In order to get more, it is need to specify next page)
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
                * @returns {module:API.cvat.classes.Task[]}
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
                * @returns {module:API.cvat.classes.Job[]}
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
                * @returns {module:API.cvat.classes.User[]}
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
                *     classes: {
                *       Job: {
                *         prototype: {
                *           annotations: {
                *             put: {
                *               // The first argument "self" is a plugin, like in a case above
                *               // The second argument is an argument of the
                *               // Job.annotations.put()
                *               // It contains an array of objects to put
                *               // In this sample we round objects coordinates and save them
                *               enter(self, objects) {
                *                 for (const obj of objects) {
                *                   if (obj.type != 'tag') {
                *                     const points = obj.position.map((point) => {
                *                       const roundPoint = {
                *                         x: Math.round(point.x),
                *                         y: Math.round(point.y),
                *                       };
                *                       return roundPoint;
                *                     });
                *                   }
                *                 }
                *               },
                *             },
                *           },
                *         },
                *       },
                *     },
                *   },
                *   // In general you can add any others members to your plugin
                *   // Members below are only examples
                *   internal: {
                *     async getPlugins() {
                *       // Collect information about installed plugins
                *       const plugins = await cvat.plugins.list();
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
            * Namespace to working with logs
            * @namespace logger
            * @memberof module:API.cvat
        */
        /**
             * Method to logger configuration
             * @method configure
             * @memberof module:API.cvat.logger
             * @param {function} isActiveChecker - callback to know if logger
             * should increase working time or not
             * @param {object} userActivityCallback - container for a callback <br>
             * Logger put here a callback to update user activity timer <br>
             * You can call it outside
             * @instance
             * @async
             * @throws {module:API.cvat.exceptions.PluginError}
             * @throws {module:API.cvat.exceptions.ArgumentError}
         */

        /**
            * Append log to a log collection <br>
            * Durable logs will have been added after "close" method is called for them <br>
            * Ignore rules exist for some logs (e.g. zoomImage, changeAttribute) <br>
            * Payload of ignored logs are shallowly combined to previous logs of the same type
            * @method log
            * @memberof module:API.cvat.logger
            * @param {module:API.cvat.enums.LogType | string} type - log type
            * @param {Object} [payload = {}] - any other data that will be appended to the log
            * @param {boolean} [wait = false] - specifies if log is durable
            * @returns {module:API.cvat.classes.Log}
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.PluginError}
            * @throws {module:API.cvat.exceptions.ArgumentError}
        */

        /**
            * Save accumulated logs on a server
            * @method save
            * @memberof module:API.cvat.logger
            * @throws {module:API.cvat.exceptions.PluginError}
            * @throws {module:API.cvat.exceptions.ServerError}
            * @instance
            * @async
        */
        logger: loggerStorage,
        /**
            * Namespace contains some changeable configurations
            * @namespace config
            * @memberof module:API.cvat
        */
        config: {
            /**
                * @memberof module:API.cvat.config
                * @property {string} backendAPI host with a backend api
                * @memberof module:API.cvat.config
                * @property {string} proxy Axios proxy settings.
                * For more details please read <a href="https://github.com/axios/axios"> here </a>
                * @memberof module:API.cvat.config
                * @memberof module:API.cvat.config
            */
            get backendAPI() {
                return config.backendAPI;
            },
            set backendAPI(value) {
                config.backendAPI = value;
            },
            get proxy() {
                return config.proxy;
            },
            set proxy(value) {
                config.proxy = value;
            },
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
            ShareFileType,
            TaskStatus,
            TaskMode,
            AttributeType,
            ObjectType,
            ObjectShape,
            LogType,
            HistoryActions,
            colors,
        },
        /**
            * Namespace is used for access to exceptions
            * @namespace exceptions
            * @memberof module:API.cvat
        */
        exceptions: {
            Exception,
            ArgumentError,
            DataError,
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
            Task,
            User,
            Job,
            Log,
            Attribute,
            Label,
            Statistics,
            ObjectState,
        },
    };

    cvat.server = Object.freeze(cvat.server);
    cvat.tasks = Object.freeze(cvat.tasks);
    cvat.jobs = Object.freeze(cvat.jobs);
    cvat.users = Object.freeze(cvat.users);
    cvat.plugins = Object.freeze(cvat.plugins);
    cvat.client = Object.freeze(cvat.client);
    cvat.enums = Object.freeze(cvat.enums);

    const implementAPI = require('./api-implementation');

    Math.clamp = function (value, min, max) {
        return Math.min(Math.max(value, min), max);
    };

    const implemented = Object.freeze(implementAPI(cvat));
    return implemented;
}

module.exports = build();
