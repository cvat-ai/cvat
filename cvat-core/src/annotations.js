// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const serverProxy = require('./server-proxy');
    const Collection = require('./annotations-collection');
    const AnnotationsSaver = require('./annotations-saver');
    const AnnotationsHistory = require('./annotations-history');
    const { checkObjectType } = require('./common');
    const { Project } = require('./project');
    const { Task, Job } = require('./session');
    const { Loader } = require('./annotation-formats');
    const { ScriptingError, DataError, ArgumentError } = require('./exceptions');

    const jobCache = new WeakMap();
    const taskCache = new WeakMap();

    function getCache(sessionType) {
        if (sessionType === 'task') {
            return taskCache;
        }

        if (sessionType === 'job') {
            return jobCache;
        }

        throw new ScriptingError(`Unknown session type was received ${sessionType}`);
    }

    async function getAnnotationsFromServer(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (!cache.has(session)) {
            const rawAnnotations = await serverProxy.annotations.getAnnotations(sessionType, session.id);

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
            // eslint-disable-next-line no-unsanitized/method
            collection.import(rawAnnotations);

            const saver = new AnnotationsSaver(rawAnnotations.version, collection, session);

            cache.set(session, {
                collection,
                saver,
                history,
            });
        }
    }

    async function closeSession(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            cache.delete(session);
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

    function searchEmptyFrame(session, frameFrom, frameTo) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.searchEmpty(frameFrom, frameTo);
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

    async function clearAnnotations(session, reload, startframe, endframe, delTrackKeyframesOnly) {
        checkObjectType('reload', reload, 'boolean', null);
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            cache.get(session).collection.clear(startframe, endframe, delTrackKeyframesOnly);
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
            throw new ArgumentError('A loader must be instance of Loader class');
        }
        await serverProxy.annotations.uploadAnnotations(sessionType, session.id, file, loader.name);
    }

    function importAnnotations(session, data) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            // eslint-disable-next-line no-unsanitized/method
            return cache.get(session).collection.import(data);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function exportAnnotations(session) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).collection.export();
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    async function exportDataset(instance, format, name, saveImages = false) {
        if (!(format instanceof String || typeof format === 'string')) {
            throw new ArgumentError('Format must be a string');
        }
        if (!(instance instanceof Task || instance instanceof Project || instance instanceof Job)) {
            throw new ArgumentError('A dataset can only be created from a job, task or project');
        }
        if (typeof saveImages !== 'boolean') {
            throw new ArgumentError('Save images parameter must be a boolean');
        }

        let result = null;
        if (instance instanceof Task) {
            result = await serverProxy.tasks.exportDataset(instance.id, format, name, saveImages);
        } else if (instance instanceof Job) {
            result = await serverProxy.tasks.exportDataset(instance.taskId, format, name, saveImages);
        } else {
            result = await serverProxy.projects.exportDataset(instance.id, format, name, saveImages);
        }

        return result;
    }

    function importDataset(instance, format, file, updateStatusCallback = () => {}) {
        if (!(typeof format === 'string')) {
            throw new ArgumentError('Format must be a string');
        }
        if (!(instance instanceof Project)) {
            throw new ArgumentError('Instance should be a Project instance');
        }
        if (!(typeof updateStatusCallback === 'function')) {
            throw new ArgumentError('Callback should be a function');
        }
        if (!(['application/zip', 'application/x-zip-compressed'].includes(file.type))) {
            throw new ArgumentError('File should be file instance with ZIP extension');
        }
        return serverProxy.projects.importDataset(instance.id, format, file, updateStatusCallback);
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

    function freezeHistory(session, frozen) {
        const sessionType = session instanceof Task ? 'task' : 'job';
        const cache = getCache(sessionType);

        if (cache.has(session)) {
            return cache.get(session).history.freeze(frozen);
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
        searchEmptyFrame,
        splitAnnotations,
        groupAnnotations,
        clearAnnotations,
        annotationsStatistics,
        selectObject,
        uploadAnnotations,
        importAnnotations,
        exportAnnotations,
        exportDataset,
        importDataset,
        undoActions,
        redoActions,
        freezeHistory,
        clearActions,
        getActions,
        closeSession,
    };
})();
