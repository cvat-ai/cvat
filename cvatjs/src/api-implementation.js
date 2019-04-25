/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
    global:false
*/


(() => {
    const PluginRegistry = require('./plugins');
    const User = require('./user');
    const Exception = require('./exceptions');
    const Statistics = require('./statistics');
    const FrameData = require('./frames');
    const ObjectState = require('./object-state');
    const ServerProxy = require('./server-proxy');
    const { Base, Task, Job } = require('./annotations');

    function implement(cvat) {
        cvat.plugins.list.implementation = PluginRegistry.list;
        cvat.plugins.register.implementation = PluginRegistry.register;

        // Stub
        cvat.server.about.implementation = async () => {
            return {
                name: 'Computer Vision Annotation Tool',
                description: 'CVAT is completely re-designed and re-implemented '
                    + 'version of Video Annotation Tool from Irvine, California '
                    + 'tool. It is free, online, interactive video and image '
                    + 'annotation tool for computer vision. It is being used by '
                    + 'our team to annotate million of objects with different '
                    + 'properties. Many UI and UX decisions are based on feedbacks'
                    + 'from professional data annotation team.',

                version: '0.4.dev20190411083901',
            };
        };

        cvat.server.share.implementation = async (directory) => {
            return [
                {
                    name: 'file_1',
                    type: 'REG',
                },
                {
                    name: 'file_2',
                    type: 'REG',
                },
                {
                    name: 'file_3',
                    type: 'REG',
                },
                {
                    name: 'dir_1',
                    type: 'DIR',
                },
            ];
        };

        cvat.server.login.implementation = async () => {

        };

        cvat.tasks.get.implementation = async (filter) => {
            return [new Task()];
        };

        cvat.jobs.get.implementation = async (filter) => {
            return [new Job({})];
        };

        cvat.users.get.implementation = async (filter) => {
            return [new User()];
        };

        function checkContext(wrappedFunction) {
            return async function wrapper(...args) {
                if (!(this instanceof Base)) {
                    throw new Exception('Bad context for the function');
                }

                try {
                    if (this instanceof Task) {
                        global.cvat.client.taskID = this.id;
                    } else if (this instanceof Job) {
                        global.cvat.client.jobID = this.id;
                        global.cvat.client.taskID = this.task.id;
                    }
                    const result = await wrappedFunction.call(this, ...args);
                    return result;
                } finally {
                    delete global.cvat.client.taskID;
                    delete global.cvat.client.jobID;
                }
            };
        }

        cvat.Task.annotations.upload.implementation = checkContext(
            async (file) => {
                // TODO: Update annotations
            },
        );

        cvat.Task.annotations.save.implementation = checkContext(
            async () => {
                // TODO: Save annotation on a server
            },
        );

        cvat.Task.annotations.clear.implementation = checkContext(
            async () => {
                // TODO: Remove all annotations
            },
        );

        cvat.Task.annotations.dump.implementation = checkContext(
            async () => {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                return `${host}/api/${api}/tasks/${this.taskID}/annotations/dump`;
            },
        );

        cvat.Task.annotations.statistics.implementation = checkContext(
            async () => {
                return new Statistics();
            },
        );

        cvat.Task.annotations.put.implementation = checkContext(
            async (arrayOfObjects) => {
                // TODO: Make from objects
            },
        );

        cvat.Task.annotations.get.implementation = checkContext(
            async (frame, filter) => {
                return [new ObjectState()];
                // TODO: Return collection
            },
        );

        cvat.Task.annotations.search.implementation = checkContext(
            async (filter, frameFrom, frameTo) => {
                return 0;
            },
        );

        cvat.Task.annotations.select.implementation = checkContext(
            async (frame, x, y) => {
                return null;
            },
        );

        cvat.Task.frames.get.implementation = checkContext(
            async (frame) => {
                return new FrameData(this.taskID, frame);
            },
        );

        cvat.Task.logs.put.implementation = checkContext(
            async (logType, details) => {
                // TODO: Put log into collection
            },
        );

        cvat.Task.logs.save.implementation = checkContext(
            async () => {

            },
        );

        cvat.Task.actions.undo.implementation = checkContext(
            async (count) => {
                // TODO: Undo
            },
        );

        cvat.Task.actions.redo.implementation = checkContext(
            async (count) => {
                // TODO: Redo
            },
        );

        cvat.Task.actions.clear.implementation = checkContext(
            async () => {
                // TODO: clear
            },
        );

        cvat.Task.events.subscribe.implementation = checkContext(
            async (type, callback) => {
                // TODO: Subscribe
            }
        );

        cvat.Task.events.unsubscribe.implementation = checkContext(
            async (type, callback) => {
                // TODO: Save log collection
            },
        );

        return cvat;
    }

    module.exports = implement;
})();
