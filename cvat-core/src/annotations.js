/*
* Copyright (C) 2019-2020 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const serverProxy = require('./server-proxy');
    const Collection = require('./annotations-collection');
    const AnnotationsSaver = require('./annotations-saver');
    const AnnotationsHistory = require('./annotations-history');
    const { checkObjectType } = require('./common');
    const { Task } = require('./session');
    const {
        Loader,
        Dumper,
    } = require('./annotation-format.js');
    const {
        ScriptingError,
        DataError,
        ArgumentError,
    } = require('./exceptions');

    const jobCache = new WeakMap();
    const taskCache = new WeakMap();

    function getCache(sessionType) {
        if (sessionType === 'task') {
            return taskCache;
        }

        if (sessionType === 'job') {
            return jobCache;
        }

        throw new ScriptingError(
            `Unknown session type was received ${sessionType}`,
        );
    }

    async function getAnnotationsFromServer(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (!cache.has(session)) {
            const rawAnnotations = await serverProxy.annotations
                .getAnnotations(sessionType, session.id);

            // Get meta information about frames
            const startFrame = sessionType === 'job' ? session.startFrame : 0;
            const stopFrame = sessionType === 'job' ? session.stopFrame : session.size - 1;
            const frameMeta = {};
            for (let i = startFrame; i <= stopFrame; i++) {
                frameMeta[i] = await session.frames.get(i);
            }

            const history = new AnnotationsHistory();
            const collection = new Collection({
                labels: session.labels || session.task.labels,
                history,
                startFrame,
                stopFrame,
                frameMeta,
            });
            collection.import(rawAnnotations);

            const saver = new AnnotationsSaver(rawAnnotations.version, collection, session);

            cache.set(session, {
                collection,
                saver,
                history,
            });
        }
    }

    async function getAnnotations(session, frame, allTracks, filters) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.get(frame, allTracks, filters);
        }

        await getAnnotationsFromServer(session);
        return cache.get(session).collection.get(frame, allTracks, filters);
    }

    async function saveAnnotations(session, onUpdate) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            await cache.get(session).saver.save(onUpdate);
        }

        // If a collection wasn't uploaded, than it wasn't changed, finally we shouldn't save it
    }

    function searchAnnotations(session, filters, frameFrom, frameTo) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.search(filters, frameFrom, frameTo);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function mergeAnnotations(session, objectStates) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.merge(objectStates);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function splitAnnotations(session, objectState, frame) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.split(objectState, frame);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function groupAnnotations(session, objectStates, reset) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.group(objectStates, reset);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function hasUnsavedChanges(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).saver.hasUnsavedChanges();
        }

        return false;
    }

    async function clearAnnotations(session, reload) {
        checkObjectType('reload', reload, 'boolean', null);
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            cache.get(session).collection.clear();
        }

        if (reload) {
            cache.delete(session);
            await getAnnotationsFromServer(session);
        }
    }

    function annotationsStatistics(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.statistics();
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function putAnnotations(session, objectStates) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.put(objectStates);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function selectObject(session, objectStates, x, y) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.select(objectStates, x, y);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    async function uploadAnnotations(session, file, loader) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        if (!(loader instanceof Loader)) {
            throw new ArgumentError(
                'A loader must be instance of Loader class',
            );
        }
        await serverProxy.annotations.uploadAnnotations(sessionType, session.id, file, loader.name);
    }

    async function dumpAnnotations(session, name, dumper) {
        if (!(dumper instanceof Dumper)) {
            throw new ArgumentError(
                'A dumper must be instance of Dumper class',
            );
        }

        let result = null;
        const sessionType = session instanceof Task ? 'task' : 'job';
        if (sessionType === 'job') {
            result = await serverProxy.annotations
                .dumpAnnotations(session.task.id, name, dumper.name);
        } else {
            result = await serverProxy.annotations
                .dumpAnnotations(session.id, name, dumper.name);
        }

        return result;
    }

    async function exportDataset(session, format) {
        if (!(format instanceof String || typeof format === 'string')) {
            throw new ArgumentError(
                'Format must be a string',
            );
        }
        if (!(session instanceof Task)) {
            throw new ArgumentError(
                'A dataset can only be created from a task',
            );
        }

        let result = null;
        result = await serverProxy.tasks
            .exportDataset(session.id, format);

        return result;
    }

    function undoActions(session, count) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).history.undo(count);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function redoActions(session, count) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).history.redo(count);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function clearActions(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).history.clear();
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function getActions(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).history.get();
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    module.exports = {
        getAnnotations,
        putAnnotations,
        saveAnnotations,
        hasUnsavedChanges,
        mergeAnnotations,
        searchAnnotations,
        splitAnnotations,
        groupAnnotations,
        clearAnnotations,
        annotationsStatistics,
        selectObject,
        uploadAnnotations,
        dumpAnnotations,
        exportDataset,
        undoActions,
        redoActions,
        clearActions,
        getActions,
    };
})();
