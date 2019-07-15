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

    async function getAnnotationsFromServer(session) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
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
    }

    async function getAnnotations(session, frame, filter) {
        await getAnnotationsFromServer(session);
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);
        return cache[session.id].collection.get(frame, filter);
    }

    async function saveAnnotations(session, onUpdate) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            await cache[session.id].saver.save(onUpdate);
        }

        // If a collection wasn't uploaded, than it wasn't changed, finally we shouldn't save it
    }

    function mergeAnnotations(session, objectStates) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].collection.merge(objectStates);
        }

        throw window.cvat.exceptions.DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function splitAnnotations(session, objectState, frame) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].collection.split(objectState, frame);
        }

        throw window.cvat.exceptions.DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function groupAnnotations(session, objectStates, reset) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].collection.group(objectStates, reset);
        }

        throw window.cvat.exceptions.DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function hasUnsavedChanges(session) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].saver.hasUnsavedChanges();
        }

        return false;
    }

    async function clearAnnotations(session, reload) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            cache[session.id].collection.clear();
        }

        if (reload) {
            delete cache[session.id];
            await getAnnotationsFromServer(session);
        }
    }

    function annotationsStatistics(session) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].collection.statistics();
        }

        throw window.cvat.exceptions.DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function putAnnotations(session, objectStates) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].collection.put(objectStates);
        }

        throw window.cvat.exceptions.DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function selectObject(session, objectStates, x, y) {
        const sessionType = session instanceof window.cvat.classes.Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (session.id in cache) {
            return cache[session.id].collection.select(objectStates, x, y);
        }

        throw window.cvat.exceptions.DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    module.exports = {
        getAnnotations,
        putAnnotations,
        saveAnnotations,
        hasUnsavedChanges,
        mergeAnnotations,
        splitAnnotations,
        groupAnnotations,
        clearAnnotations,
        annotationsStatistics,
        selectObject,
    };
})();
