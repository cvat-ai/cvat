/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const serverProxy = require('./server-proxy');
    const Collection = require('./annotations-collection');

    const jobCache = {};
    const taskCache = {};

    async function getJobAnnotations(job, frame, filter) {
        if (!(job.id in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getJobAnnotations(job.id);
            jobCache[job.id] = new Collection(job.task.labels);
            jobCache[job.id].import(rawAnnotations);
        }

        return jobCache[job.id].get(frame, filter);
    }

    async function getTaskAnnotations(task, frame, filter) {
        if (!(task.id in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getTaskAnnotations(task.id);
            taskCache[task.id] = new Collection(task.labels);
            taskCache[task.id].import(rawAnnotations);
        }

        return taskCache[task.id].get(frame, filter);
    }

    module.exports = {
        getJobAnnotations,
        getTaskAnnotations,
    };
})();
