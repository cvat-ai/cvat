/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/


(() => {
    /**
        * Class representing a job.
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Job {
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

            Object.defineProperties(this, {
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
                /**
                    * Method updates job data like status or assignee
                    * @method save
                    * @memberof module:API.cvat.classes.Job
                    * @readonly
                    * @instance
                */
                save() {

                },
            });
        }
    }

    module.exports = Job;
})();
