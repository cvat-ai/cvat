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
        * Class representing a job.
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Job {
        constructor(initialData) {
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
            * @throws {module:API.cvat.exception.ServerError}
            * @throws {module:API.cvat.exception.PluginError}
        */
        async save() {
            const result = await PluginRegistry
                .apiWrapper.call(this, Job.prototype.save);
            return result;
        }
    }

    module.exports = Job;
})();
