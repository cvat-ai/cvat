/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    global:false
*/


(() => {
    /**
        * Class representing a job.
        * You should not create instances of this class manually
        * @memberof module:API.cvat.classes
    */
    class Job {
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
                        throw new global.cvat.exceptions.ArgumentError(
                            `Job field "${property}" was not initialized`,
                        );
                    }
                }
            }

            Object.defineProperties(this, {
                id: {
                    /**
                        * @name id
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Job
                        * @readonly
                        * @instance
                    */
                    get: () => data.id,
                },
                assignee: {
                    /**
                        * Identifier of a user who is responsible for the job
                        * @name assignee
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Job
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
                status: {
                    /**
                        * @name status
                        * @type {module:API.cvat.enums.TaskStatus}
                        * @memberof module:API.cvat.classes.Job
                        * @instance
                        * @throws {module:API.cvat.exceptions.ArgumentError}
                    */
                    get: () => data.status,
                    set: (status) => {
                        const type = global.cvat.enums.TaskStatus;
                        let valueInEnum = false;
                        for (const value in type) {
                            if (type[value] === status) {
                                valueInEnum = true;
                                break;
                            }
                        }

                        if (!valueInEnum) {
                            throw new global.cvat.exceptions.ArgumentError(
                                'Value must be a value from the enumeration cvat.enums.TaskStatus',
                            );
                        }

                        data.status = status;
                    },
                },
                startFrame: {
                    /**
                        * @name startFrame
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Job
                        * @readonly
                        * @instance
                    */
                    get: () => data.start_frame,
                },
                stopFrame: {
                    /**
                        * @name stopFrame
                        * @type {integer}
                        * @memberof module:API.cvat.classes.Job
                        * @readonly
                        * @instance
                    */
                    get: () => data.stop_frame,
                },
                task: {
                    /**
                        * @name task
                        * @type {module:API.cvat.classes.Task}
                        * @memberof module:API.cvat.classes.Job
                        * @readonly
                        * @instance
                    */
                    get: () => data.task,
                },
            });
        }
    }

    module.exports = Job;
})();
