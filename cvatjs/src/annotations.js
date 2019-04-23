/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    global:false
    require:false
*/

(() => {
    const { Attribute, Label } = require('./labels');
    const Exception = require('./exceptions');

    class Base {
        constructor() {
            this.annotations = {
                upload: global.cvat.Task.annotations.upload.bind(this),
                save: global.cvat.Task.annotations.save.bind(this),
                clear: global.cvat.Task.annotations.clear.bind(this),
                dump: global.cvat.Task.annotations.dump.bind(this),
                statistics: global.cvat.Task.annotations.statistics.bind(this),
                put: global.cvat.Task.annotations.put.bind(this),
                get: global.cvat.Task.annotations.get.bind(this),
                search: global.cvat.Task.annotations.search.bind(this),
                select: global.cvat.Task.annotations.select.bind(this),
            };

            this.frames = {
                get: global.cvat.Task.frames.get.bind(this),
            };

            this.logs = {
                put: global.cvat.Task.logs.put.bind(this),
                save: global.cvat.Task.logs.save.bind(this),
            };

            this.actions = {
                undo: global.cvat.Task.actions.undo.bind(this),
                redo: global.cvat.Task.actions.redo.bind(this),
                clear: global.cvat.Task.actions.clear.bind(this),
            };

            this.events = {
                subscribe: global.cvat.Task.events.subscribe.bind(this),
                unsubscribe: global.cvat.Task.events.unsubscribe.bind(this),
            };
        }
    }

    /**
        * Class representing a job
    */
    class Job extends Base {
        constructor(initialData) {
            super();

            this.id = null;
            this.assignee = null;
            this.status = null;
            this.startFrame = null;
            this.stopFrame = null;
            this.task = null;

            for (const property in this) {
                if (Object.prototype.hasOwnProperty.call(this, property)) {
                    if (property in initialData) {
                        this[property] = initialData[property];
                    }
                    if (this[property] === null) {
                        throw new Exception('Some fields in job is not initialized');
                    }
                }
            }
        }
    }

    /**
        * Class representing a task
    */
    class Task extends Base {
        constructor(initialData = {}) {
            super();

            this.id = null;
            this.name = null;
            this.status = null;
            this.size = null;
            this.mode = null;
            this.owner = null;
            this.assignee = null;
            this.createdDate = null;
            this.updatedDate = null;
            this.bugTracker = null;
            this.overlap = null;
            this.segmentSize = null;
            this.zOrder = null;
            this.labels = [];
            this.jobs = [];
            this.data = {
                sever_files: null,
                client_files: null,
                remote_files: null,
            };

            for (const property in this) {
                if (Object.prototype.hasOwnProperty.call(this, property)
                    && property in initialData) {
                    this[property] = initialData[property];
                }
            }
        }
    }

    module.exports = {
        Base,
        Task,
        Job,
    };
})();
