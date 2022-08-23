// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    const serverProxy = require('./server-proxy');
    const Collection = require('./annotations-collection');
    const AnnotationsSaver = require('./annotations-saver');
    const AnnotationsHistory = require('./annotations-history').default;
    const { checkObjectType } = require('./common');
    const { Project } = require('./project');
    const { Task, Job } = require('./session');
    const { Loader } = require('./annotation-formats');
    const { ScriptingError, DataError, ArgumentError } = require('./exceptions');
    const { getDeletedFrames } = require('./frames');

    const jobCache = new WeakMap();
    const taskCache = new WeakMap();

    function getCache(instanceType) {
        if (instanceType === 'task') {
            return taskCache;
        }

        if (instanceType === 'job') {
            return jobCache;
        }

        throw new ScriptingError(`Unknown session type was received ${instanceType}`);
    }

    async function getAnnotationsFromServer(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (!cache.has(annotatableInstance)) {
            const rawAnnotations = await serverProxy.annotations.getAnnotations(instanceType, annotatableInstance.id);

            // Get meta information about frames
            const startFrame = instanceType === 'job' ? annotatableInstance.startFrame : 0;
            const stopFrame = instanceType === 'job' ? annotatableInstance.stopFrame : annotatableInstance.size - 1;
            const frameMeta = {};
            for (let i = startFrame; i <= stopFrame; i++) {
                frameMeta[i] = await annotatableInstance.frames.get(i);
            }
            frameMeta.deleted_frames = await getDeletedFrames(instanceType, annotatableInstance.id);

            const history = new AnnotationsHistory();
            const collection = new Collection({
                labels: annotatableInstance.labels || annotatableInstance.task.labels,
                history,
                startFrame,
                stopFrame,
                frameMeta,
            });

            // eslint-disable-next-line no-unsanitized/method
            collection.import(rawAnnotations);

            const saver = new AnnotationsSaver(rawAnnotations.version, collection, annotatableInstance);

            cache.set(annotatableInstance, {
                collection,
                saver,
                history,
            });
        }
    }

    async function clearCache(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            cache.delete(annotatableInstance);
        }
    }

    async function getAnnotations(annotatableInstance, frame, allTracks, filters) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.get(frame, allTracks, filters);
        }

        await getAnnotationsFromServer(annotatableInstance);
        return cache.get(annotatableInstance).collection.get(frame, allTracks, filters);
    }

    async function saveAnnotations(annotatableInstance, onUpdate) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            await cache.get(annotatableInstance).saver.save(onUpdate);
        }

        // If a collection wasn't uploaded, than it wasn't changed, finally we shouldn't save it
    }

    function searchAnnotations(annotatableInstance, filters, frameFrom, frameTo) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.search(filters, frameFrom, frameTo);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function searchEmptyFrame(annotatableInstance, frameFrom, frameTo) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.searchEmpty(frameFrom, frameTo);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function mergeAnnotations(annotatableInstance, objectStates) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.merge(objectStates);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function splitAnnotations(annotatableInstance, objectState, frame) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.split(objectState, frame);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function groupAnnotations(annotatableInstance, objectStates, reset) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.group(objectStates, reset);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function hasUnsavedChanges(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).saver.hasUnsavedChanges();
        }

        return false;
    }

    async function clearAnnotations(annotatableInstance, reload, startframe, endframe, delTrackKeyframesOnly) {
        checkObjectType('reload', reload, 'boolean', null);
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            cache.get(annotatableInstance).collection.clear(startframe, endframe, delTrackKeyframesOnly);
        }

        if (reload) {
            cache.delete(annotatableInstance);
            await getAnnotationsFromServer(annotatableInstance);
        }
    }

    function annotationsStatistics(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.statistics();
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function putAnnotations(annotatableInstance, objectStates) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.put(objectStates);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function selectObject(annotatableInstance, objectStates, x, y) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.select(objectStates, x, y);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    async function uploadAnnotations(annotatableInstance, file, loader) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        if (!(loader instanceof Loader)) {
            throw new ArgumentError('A loader must be instance of Loader class');
        }
        await serverProxy.annotations.uploadAnnotations(instanceType, annotatableInstance.id, file, loader.name);
    }

    function importAnnotations(annotatableInstance, data) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            // eslint-disable-next-line no-unsanitized/method
            return cache.get(annotatableInstance).collection.import(data);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function exportAnnotations(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).collection.export();
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    async function exportDataset(annotatableInstance, format, name, saveImages = false) {
        if (!(format instanceof String || typeof format === 'string')) {
            throw new ArgumentError('Format must be a string');
        }
        if (!(annotatableInstance instanceof Task ||
            annotatableInstance instanceof Project ||
            annotatableInstance instanceof Job
        )) {
            throw new ArgumentError('A dataset can only be created from a job, task or project');
        }
        if (typeof saveImages !== 'boolean') {
            throw new ArgumentError('Save images parameter must be a boolean');
        }

        let result = null;
        if (annotatableInstance instanceof Task) {
            result = await serverProxy.tasks.exportDataset(annotatableInstance.id, format, name, saveImages);
        } else if (annotatableInstance instanceof Job) {
            result = await serverProxy.tasks.exportDataset(annotatableInstance.taskId, format, name, saveImages);
        } else {
            result = await serverProxy.projects.exportDataset(annotatableInstance.id, format, name, saveImages);
        }

        return result;
    }

    function importDataset(annotatableInstance, format, file, updateStatusCallback = () => {}) {
        if (!(typeof format === 'string')) {
            throw new ArgumentError('Format must be a string');
        }
        if (!(annotatableInstance instanceof Project)) {
            throw new ArgumentError('Instance should be a Project instance');
        }
        if (!(typeof updateStatusCallback === 'function')) {
            throw new ArgumentError('Callback should be a function');
        }
        if (!(['application/zip', 'application/x-zip-compressed'].includes(file.type))) {
            throw new ArgumentError('File should be file instance with ZIP extension');
        }
        return serverProxy.projects.importDataset(annotatableInstance.id, format, file, updateStatusCallback);
    }

    function getHistory(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).history;
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function undoActions(annotatableInstance, count) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).history.undo(count);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function redoActions(annotatableInstance, count) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).history.redo(count);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function freezeHistory(annotatableInstance, frozen) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).history.freeze(frozen);
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function clearActions(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).history.clear();
        }

        throw new DataError(
            'Collection has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
        );
    }

    function getActions(annotatableInstance) {
        const instanceType = annotatableInstance instanceof Task ? 'task' : 'job';
        const cache = getCache(instanceType);

        if (cache.has(annotatableInstance)) {
            return cache.get(annotatableInstance).history.get();
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
        getHistory,
        clearActions,
        getActions,
        clearCache,
    };
})();
