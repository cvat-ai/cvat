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
    const AnnotationsSaver = require('./annotations-saver');

    const jobCache = {};
    const taskCache = {};

    async function getJobAnnotations(job, frame, filter) {
        if (!(job.id in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getJobAnnotations(job.id);
            const collection = new Collection(job.task.labels).import(rawAnnotations);
            const saver = new AnnotationsSaver(rawAnnotations.version, collection, job);

            jobCache[job.id] = {
                collection,
                saver,
            };
        }

        return jobCache[job.id].collection.get(frame, filter);
    }

    async function getTaskAnnotations(task, frame, filter) {
        if (!(task.id in jobCache)) {
            const rawAnnotations = await serverProxy.annotations.getTaskAnnotations(task.id);
            const collection = new Collection(task.labels).import(rawAnnotations);
            const saver = new AnnotationsSaver(rawAnnotations.version, collection, task);

            taskCache[task.id] = {
                collection,
                saver,
            };
        }

        return taskCache[task.id].collection.get(frame, filter);
    }

    async function saveJobAnnotations(job, onUpdate) {
        if (job.id in jobCache) {
            await jobCache[job.id].saver.save(onUpdate);
        }

        // If a collection wasn't uploaded, than it wasn't changed, finally we shouldn't save it
    }

    async function saveTaskAnnotations(task, onUpdate) {
        if (task.id in taskCache) {
            await taskCache[task.id].saver.save(onUpdate);
        }

        // If a collection wasn't uploaded, than it wasn't changed, finally we shouldn't save it
    }

    module.exports = {
        getJobAnnotations,
        getTaskAnnotations,
        saveJobAnnotations,
        saveTaskAnnotations,
    };
})();
