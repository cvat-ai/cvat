// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const PluginRegistry = require('./plugins');
    const serverProxy = require('./server-proxy');
    const { ArgumentError } = require('./exceptions');
    const { Task } = require('./session');
    const { Label } = require('./labels');
    const User = require('./user');

    /**
     * Class representing a project
     * @memberof module:API.cvat.classes
     */
    class Project {
        /**
         * In a fact you need use the constructor only if you want to create a project
         * @param {object} initialData - Object which is used for initalization
         * <br> It can contain keys:
         * <br> <li style="margin-left: 10px;"> name
         * <br> <li style="margin-left: 10px;"> labels
         */
        constructor(initialData) {
            const data = {
                id: undefined,
                name: undefined,
                status: undefined,
                assignee: undefined,
                owner: undefined,
                bug_tracker: undefined,
                created_date: undefined,
                updated_date: undefined,
                task_subsets: undefined,
            };

            for (const property in data) {
                if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                    data[property] = initialData[property];
                }
            }

            data.labels = [];
            data.tasks = [];

            if (Array.isArray(initialData.labels)) {
                for (const label of initialData.labels) {
                    const classInstance = new Label(label);
                    data.labels.push(classInstance);
                }
            }

            if (Array.isArray(initialData.tasks)) {
                for (const task of initialData.tasks) {
                    const taskInstance = new Task(task);
                    data.tasks.push(taskInstance);
                }
            }
            if (!data.task_subsets && data.tasks.length) {
                const subsetsSet = new Set();
                for (const task in data.tasks) {
                    if (task.subset) subsetsSet.add(task.subset);
                }
                data.task_subsets = Array.from(subsetsSet);
            }

            Object.defineProperties(
                this,
                Object.freeze({
                    /**
                     * @name id
                     * @type {integer}
                     * @memberof module:API.cvat.classes.Project
                     * @readonly
                     * @instance
                     */
                    id: {
                        get: () => data.id,
                    },
                    /**
                     * @name name
                     * @type {string}
                     * @memberof module:API.cvat.classes.Project
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    name: {
                        get: () => data.name,
                        set: (value) => {
                            if (!value.trim().length) {
                                throw new ArgumentError('Value must not be empty');
                            }
                            data.name = value;
                        },
                    },
                    /**
                     * @name status
                     * @type {module:API.cvat.enums.TaskStatus}
                     * @memberof module:API.cvat.classes.Project
                     * @readonly
                     * @instance
                     */
                    status: {
                        get: () => data.status,
                    },
                    /**
                     * Instance of a user who was assigned for the project
                     * @name assignee
                     * @type {module:API.cvat.classes.User}
                     * @memberof module:API.cvat.classes.Project
                     * @readonly
                     * @instance
                     */
                    assignee: {
                        get: () => data.assignee,
                        set: (assignee) => {
                            if (assignee !== null && !(assignee instanceof User)) {
                                throw new ArgumentError('Value must be a user instance');
                            }
                            data.assignee = assignee;
                        },
                    },
                    /**
                     * Instance of a user who has created the project
                     * @name owner
                     * @type {module:API.cvat.classes.User}
                     * @memberof module:API.cvat.classes.Project
                     * @readonly
                     * @instance
                     */
                    owner: {
                        get: () => data.owner,
                    },
                    /**
                     * @name bugTracker
                     * @type {string}
                     * @memberof module:API.cvat.classes.Project
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
                     * After project has been created value can be appended only.
                     * @name labels
                     * @type {module:API.cvat.classes.Label[]}
                     * @memberof module:API.cvat.classes.Project
                     * @instance
                     * @throws {module:API.cvat.exceptions.ArgumentError}
                     */
                    labels: {
                        get: () => [...data.labels],
                        set: (labels) => {
                            if (!Array.isArray(labels)) {
                                throw new ArgumentError('Value must be an array of Labels');
                            }

                            if (!Array.isArray(labels) || labels.some((label) => !(label instanceof Label))) {
                                throw new ArgumentError(
                                    `Each array value must be an instance of Label. ${typeof label} was found`,
                                );
                            }

                            const IDs = labels.map((_label) => _label.id);
                            const deletedLabels = data.labels.filter((_label) => !IDs.includes(_label.id));
                            deletedLabels.forEach((_label) => {
                                _label.deleted = true;
                            });

                            data.labels = [...deletedLabels, ...labels];
                        },
                    },
                    /**
                     * Tasks linked with the project
                     * @name tasks
                     * @type {module:API.cvat.classes.Task[]}
                     * @memberof module:API.cvat.classes.Project
                     * @readonly
                     * @instance
                     */
                    tasks: {
                        get: () => [...data.tasks],
                    },
                    /**
                     * Subsets array for linked tasks
                     * @name subsets
                     * @type {string[]}
                     * @memberof module:API.cvat.classes.Project
                     * @readonly
                     * @instance
                     */
                    subsets: {
                        get: () => [...data.task_subsets],
                    },
                    _internalData: {
                        get: () => data,
                    },
                }),
            );
        }

        /**
         * Method updates data of a created project or creates new project from scratch
         * @method save
         * @returns {module:API.cvat.classes.Project}
         * @memberof module:API.cvat.classes.Project
         * @readonly
         * @instance
         * @async
         * @throws {module:API.cvat.exceptions.ServerError}
         * @throws {module:API.cvat.exceptions.PluginError}
         */
        async save() {
            const result = await PluginRegistry.apiWrapper.call(this, Project.prototype.save);
            return result;
        }

        /**
         * Method deletes a task from a server
         * @method delete
         * @memberof module:API.cvat.classes.Project
         * @readonly
         * @instance
         * @async
         * @throws {module:API.cvat.exceptions.ServerError}
         * @throws {module:API.cvat.exceptions.PluginError}
         */
        async delete() {
            const result = await PluginRegistry.apiWrapper.call(this, Project.prototype.delete);
            return result;
        }
    }

    module.exports = {
        Project,
    };

    Project.prototype.save.implementation = async function () {
        if (typeof this.id !== 'undefined') {
            const projectData = {
                name: this.name,
                assignee_id: this.assignee ? this.assignee.id : null,
                bug_tracker: this.bugTracker,
                labels: [...this._internalData.labels.map((el) => el.toJSON())],
            };

            await serverProxy.projects.save(this.id, projectData);
            return this;
        }

        const projectSpec = {
            name: this.name,
            labels: [...this.labels.map((el) => el.toJSON())],
        };

        if (this.bugTracker) {
            projectSpec.bug_tracker = this.bugTracker;
        }

        const project = await serverProxy.projects.create(projectSpec);
        return new Project(project);
    };

    Project.prototype.delete.implementation = async function () {
        const result = await serverProxy.projects.delete(this.id);
        return result;
    };
})();
