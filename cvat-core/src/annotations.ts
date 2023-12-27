// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Storage } from './storage';
import serverProxy from './server-proxy';
import AnnotationsCollection, { FrameMeta } from './annotations-collection';
import AnnotationsSaver from './annotations-saver';
import AnnotationsHistory from './annotations-history';
import { checkObjectType } from './common';
import Project from './project';
import { Task, Job } from './session';
import { ScriptingError, ArgumentError } from './exceptions';
import { getDeletedFrames } from './frames';
import { JobType } from './enums';

type WeakMapItem = { collection: AnnotationsCollection, saver: AnnotationsSaver, history: AnnotationsHistory };
const jobCache = new WeakMap<Task | Job, WeakMapItem>();
const taskCache = new WeakMap<Task | Job, WeakMapItem>();

function getCache(sessionType): WeakMap<Task | Job, WeakMapItem> {
    if (sessionType === 'task') {
        return taskCache;
    }

    if (sessionType === 'job') {
        return jobCache;
    }

    throw new ScriptingError(`Unknown session type was received ${sessionType}`);
}

class InstanceNotInitializedError extends Error {}

function getSession(session): WeakMapItem {
    const sessionType = session instanceof Task ? 'task' : 'job';
    const cache = getCache(sessionType);

    if (cache.has(session)) {
        return cache.get(session);
    }

    throw new InstanceNotInitializedError(
        'Session has not been initialized yet. Call annotations.get() or annotations.clear(true) before',
    );
}

export function getCollection(session): AnnotationsCollection {
    return getSession(session).collection;
}

export function getSaver(session): AnnotationsSaver {
    return getSession(session).saver;
}

export function getHistory(session): AnnotationsHistory {
    return getSession(session).history;
}

async function getAnnotationsFromServer(session: Job | Task): Promise<void> {
    const sessionType = session instanceof Task ? 'task' : 'job';
    const cache = getCache(sessionType);

    if (!cache.has(session)) {
        const serializedAnnotations = await serverProxy.annotations.getAnnotations(sessionType, session.id);

        // Get meta information about frames
        const startFrame = session instanceof Job ? session.startFrame : 0;
        const stopFrame = session instanceof Job ? session.stopFrame : session.size - 1;
        const frameMeta: Partial<FrameMeta> = {};
        for (let i = startFrame; i <= stopFrame; i++) {
            frameMeta[i] = await session.frames.get(i);
        }
        frameMeta.deleted_frames = await getDeletedFrames(sessionType, session.id);

        const history = new AnnotationsHistory();
        const collection = new AnnotationsCollection({
            labels: session.labels,
            history,
            stopFrame,
            frameMeta: frameMeta as FrameMeta,
            jobType: session instanceof Job ? session.type : JobType.ANNOTATION,
            dimension: session.dimension,
        });

        // eslint-disable-next-line no-unsanitized/method
        collection.import(serializedAnnotations);
        const saver = new AnnotationsSaver(serializedAnnotations.version, collection, session);
        cache.set(session, { collection, saver, history });
    }
}

export function clearCache(session): void {
    const sessionType = session instanceof Task ? 'task' : 'job';
    const cache = getCache(sessionType);

    if (cache.has(session)) {
        cache.delete(session);
    }
}

export async function getAnnotations(session, frame, allTracks, filters): Promise<ReturnType<AnnotationsCollection['get']>> {
    try {
        return getCollection(session).get(frame, allTracks, filters);
    } catch (error) {
        if (error instanceof InstanceNotInitializedError) {
            await getAnnotationsFromServer(session);
            return getCollection(session).get(frame, allTracks, filters);
        }

        throw error;
    }
}

export async function clearAnnotations(session, reload, startframe, endframe, delTrackKeyframesOnly): Promise<void> {
    checkObjectType('reload', reload, 'boolean', null);
    const sessionType = session instanceof Task ? 'task' : 'job';
    const cache = getCache(sessionType);

    if (reload) {
        cache.delete(session);
        return getAnnotationsFromServer(session);
    }

    return getCollection(session).clear(startframe, endframe, delTrackKeyframesOnly);
}

export async function exportDataset(
    instance,
    format: string,
    saveImages: boolean,
    useDefaultSettings: boolean,
    targetStorage: Storage,
    name?: string,
): Promise<string | void> {
    if (!(instance instanceof Task || instance instanceof Project || instance instanceof Job)) {
        throw new ArgumentError('A dataset can only be created from a job, task or project');
    }

    let result = null;
    if (instance instanceof Task) {
        result = await serverProxy.tasks
            .exportDataset(instance.id, format, saveImages, useDefaultSettings, targetStorage, name);
    } else if (instance instanceof Job) {
        result = await serverProxy.jobs
            .exportDataset(instance.id, format, saveImages, useDefaultSettings, targetStorage, name);
    } else {
        result = await serverProxy.projects
            .exportDataset(instance.id, format, saveImages, useDefaultSettings, targetStorage, name);
    }

    return result;
}

export function importDataset(
    instance: any,
    format: string,
    useDefaultSettings: boolean,
    sourceStorage: Storage,
    file: File | string,
    options: {
        convMaskToPoly?: boolean,
        updateStatusCallback?: (s: string, n: number) => void,
    } = {},
): Promise<void> {
    const updateStatusCallback = options.updateStatusCallback || (() => {});
    const convMaskToPoly = 'convMaskToPoly' in options ? options.convMaskToPoly : true;
    const adjustedOptions = {
        updateStatusCallback,
        convMaskToPoly,
    };

    if (!(instance instanceof Project || instance instanceof Task || instance instanceof Job)) {
        throw new ArgumentError('Instance must be a Project || Task || Job instance');
    }
    if (!(typeof updateStatusCallback === 'function')) {
        throw new ArgumentError('Callback must be a function');
    }
    if (!(typeof convMaskToPoly === 'boolean')) {
        throw new ArgumentError('Option "convMaskToPoly" must be a boolean');
    }
    const allowedFileExtensions = [
        '.zip', '.xml', '.json',
    ];
    const allowedFileExtensionsList = allowedFileExtensions.join(', ');
    if (typeof file === 'string' && !(allowedFileExtensions.some((ext) => file.toLowerCase().endsWith(ext)))) {
        throw new ArgumentError(
            `File must be file instance with one of the following extensions: ${allowedFileExtensionsList}`,
        );
    }
    const allowedMimeTypes = [
        'application/zip', 'application/x-zip-compressed',
        'application/xml', 'text/xml',
        'application/json',
    ];
    if (file instanceof File && !(allowedMimeTypes.includes(file.type))) {
        throw new ArgumentError(
            `File must be file instance with one of the following extensions: ${allowedFileExtensionsList}`,
        );
    }

    if (instance instanceof Project) {
        return serverProxy.projects
            .importDataset(
                instance.id,
                format,
                useDefaultSettings,
                sourceStorage,
                file,
                adjustedOptions,
            );
    }

    const instanceType = instance instanceof Task ? 'task' : 'job';
    return serverProxy.annotations
        .uploadAnnotations(
            instanceType,
            instance.id,
            format,
            useDefaultSettings,
            sourceStorage,
            file,
            adjustedOptions,
        );
}
