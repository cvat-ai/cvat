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

    function getCache(sessionType) {
        if (sessionType === 'task') {
            return taskCache;
        }

        if (sessionType === 'job') {
            return jobCache;
        }

        throw new window.cvat.exceptions.ScriptingError(
            `Unknown session type was received ${sessionType}`,
        );
    }

    async function getAnnotations(session, frame, filter) {
        const sessionType = session.constructor.name.toLowerCase();
        const cache = getCache(sessionType);

        if (!(session.id in cache)) {
            const rawAnnotations = await serverProxy.annotations
                .getAnnotations(sessionType, session.id);
            const collection = new Collection(session.labels || session.task.labels)
                .import(rawAnnotations);
            const saver = new AnnotationsSaver(rawAnnotations.version, collection, session);

            cache[session.id] = {
                collection,
                saver,
            };
        }

        return cache[session.id].collection.get(frame, filter);
    }

    async function saveAnnotations(session, onUpdate) {
        const sessionType = session.constructor.name.toLowerCase();
        const cache = getCache(sessionType);

        if (session.id in cache) {
            await cache[session.id].saver.save(onUpdate);
        }

        // If a collection wasn't uploaded, than it wasn't changed, finally we shouldn't save it
    }

    function hasUnsavedChanges(session) {
        const sessionType = session.constructor.name.toLowerCase();
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].saver.hasUnsavedChanges();
        }

        return false;
    }

    module.exports = {
        getAnnotations,
        saveAnnotations,
        hasUnsavedChanges,
    };
})();
