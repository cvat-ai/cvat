// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { JobStage, JobState, StorageLocation } from './enums';
import { Storage } from './storage';

import PluginRegistry from './plugins';
import { ArgumentError } from './exceptions';
import { Label } from './labels';
import User from './user';
import { FieldUpdateTrigger } from './common';

function buildDuplicatedAPI(prototype) {
    Object.defineProperties(prototype, {
        annotations: Object.freeze({
            value: {
                async upload(
                    format: string,
                    useDefaultLocation: boolean,
                    sourceStorage: Storage,
                    file: File | string,
                    options?: { convMaskToPoly?: boolean },
                ) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.upload,
                        format,
                        useDefaultLocation,
                        sourceStorage,
                        file,
                        options,
                    );
                    return result;
                },

                async save(onUpdate) {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.annotations.save, onUpdate);
                    return result;
                },

                async clear(
                    reload = false, startframe = undefined, endframe = undefined, delTrackKeyframesOnly = true,
                ) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this, prototype.annotations.clear, reload, startframe, endframe, delTrackKeyframesOnly,
                    );
                    return result;
                },

                async statistics() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.annotations.statistics);
                    return result;
                },

                async put(arrayOfObjects = []) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.put,
                        arrayOfObjects,
                    );
                    return result;
                },

                async get(frame, allTracks = false, filters = []) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.get,
                        frame,
                        allTracks,
                        filters,
                    );
                    return result;
                },

                async search(filters, frameFrom, frameTo) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.search,
                        filters,
                        frameFrom,
                        frameTo,
                    );
                    return result;
                },

                async searchEmpty(frameFrom, frameTo) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.searchEmpty,
                        frameFrom,
                        frameTo,
                    );
                    return result;
                },

                async select(objectStates, x, y) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.select,
                        objectStates,
                        x,
                        y,
                    );
                    return result;
                },

                async merge(objectStates) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.merge,
                        objectStates,
                    );
                    return result;
                },

                async split(objectState, frame) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.split,
                        objectState,
                        frame,
                    );
                    return result;
                },

                async group(objectStates, reset = false) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.group,
                        objectStates,
                        reset,
                    );
                    return result;
                },

                async import(data) {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.annotations.import, data);
                    return result;
                },

                async export() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.annotations.export);
                    return result;
                },

                async exportDataset(
                    format: string,
                    saveImages: boolean,
                    useDefaultSettings: boolean,
                    targetStorage: Storage,
                    customName?: string,
                ) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.exportDataset,
                        format,
                        saveImages,
                        useDefaultSettings,
                        targetStorage,
                        customName,
                    );
                    return result;
                },

                hasUnsavedChanges() {
                    const result = prototype.annotations.hasUnsavedChanges.implementation.call(this);
                    return result;
                },
            },
            writable: true,
        }),
        frames: Object.freeze({
            value: {
                async get(frame, isPlaying = false, step = 1) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.get,
                        frame,
                        isPlaying,
                        step,
                    );
                    return result;
                },
                async delete(frame) {
                    await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.delete,
                        frame,
                    );
                },
                async restore(frame) {
                    await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.restore,
                        frame,
                    );
                },
                async save() {
                    await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.save,
                    );
                },
                async ranges() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.frames.ranges);
                    return result;
                },
                async preview() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.frames.preview);
                    return result;
                },
                async search(filters, frameFrom, frameTo) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.search,
                        filters,
                        frameFrom,
                        frameTo,
                    );
                    return result;
                },
                async contextImage(frameId) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.contextImage,
                        frameId,
                    );
                    return result;
                },
            },
            writable: true,
        }),
        logger: Object.freeze({
            value: {
                async log(logType, payload = {}, wait = false) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.logger.log,
                        logType,
                        payload,
                        wait,
                    );
                    return result;
                },
            },
            writable: true,
        }),
        actions: Object.freeze({
            value: {
                async undo(count = 1) {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.actions.undo, count);
                    return result;
                },
                async redo(count = 1) {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.actions.redo, count);
                    return result;
                },
                async freeze(frozen) {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.actions.freeze, frozen);
                    return result;
                },
                async clear() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.actions.clear);
                    return result;
                },
                async get() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.actions.get);
                    return result;
                },
            },
            writable: true,
        }),
        events: Object.freeze({
            value: {
                async subscribe(evType, callback) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.events.subscribe,
                        evType,
                        callback,
                    );
                    return result;
                },
                async unsubscribe(evType, callback = null) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.events.unsubscribe,
                        evType,
                        callback,
                    );
                    return result;
                },
            },
            writable: true,
        }),
        predictor: Object.freeze({
            value: {
                async status() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.predictor.status);
                    return result;
                },
                async predict(frame) {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.predictor.predict, frame);
                    return result;
                },
            },
            writable: true,
        }),
    });
}

export class Session {}

export class Job extends Session {
    constructor(initialData) {
        super();
        const data = {
            id: undefined,
            assignee: null,
            stage: undefined,
            state: undefined,
            start_frame: undefined,
            stop_frame: undefined,
            project_id: null,
            task_id: undefined,
            labels: undefined,
            dimension: undefined,
            data_compressed_chunk_type: undefined,
            data_chunk_size: undefined,
            bug_tracker: null,
            mode: undefined,
        };

        const updateTrigger = new FieldUpdateTrigger();

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property)) {
                if (property in initialData) {
                    data[property] = initialData[property];
                }

                if (data[property] === undefined) {
                    throw new ArgumentError(`Job field "${property}" was not initialized`);
                }
            }
        }

        if (data.assignee) data.assignee = new User(data.assignee);
        if (Array.isArray(initialData.labels)) {
            data.labels = initialData.labels.map((labelData) => {
                // can be already wrapped to the class
                // when create this job from Task constructor
                if (labelData instanceof Label) {
                    return labelData;
                }

                return new Label(labelData);
            }).filter((label) => !label.hasParent);
        } else {
            throw new Error('Job labels must be an array');
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                assignee: {
                    get: () => data.assignee,
                    set: (assignee) => {
                        if (assignee !== null && !(assignee instanceof User)) {
                            throw new ArgumentError('Value must be a user instance');
                        }
                        updateTrigger.update('assignee');
                        data.assignee = assignee;
                    },
                },
                stage: {
                    get: () => data.stage,
                    set: (stage) => {
                        const type = JobStage;
                        let valueInEnum = false;
                        for (const value in type) {
                            if (type[value] === stage) {
                                valueInEnum = true;
                                break;
                            }
                        }

                        if (!valueInEnum) {
                            throw new ArgumentError(
                                'Value must be a value from the enumeration cvat.enums.JobStage',
                            );
                        }

                        updateTrigger.update('stage');
                        data.stage = stage;
                    },
                },
                state: {
                    get: () => data.state,
                    set: (state) => {
                        const type = JobState;
                        let valueInEnum = false;
                        for (const value in type) {
                            if (type[value] === state) {
                                valueInEnum = true;
                                break;
                            }
                        }

                        if (!valueInEnum) {
                            throw new ArgumentError(
                                'Value must be a value from the enumeration cvat.enums.JobState',
                            );
                        }

                        updateTrigger.update('state');
                        data.state = state;
                    },
                },
                startFrame: {
                    get: () => data.start_frame,
                },
                stopFrame: {
                    get: () => data.stop_frame,
                },
                projectId: {
                    get: () => data.project_id,
                },
                taskId: {
                    get: () => data.task_id,
                },
                labels: {
                    get: () => data.labels.filter((_label) => !_label.deleted),
                },
                dimension: {
                    get: () => data.dimension,
                },
                dataChunkSize: {
                    get: () => data.data_chunk_size,
                    set: (chunkSize) => {
                        if (typeof chunkSize !== 'number' || chunkSize < 1) {
                            throw new ArgumentError(
                                `Chunk size value must be a positive number. But value ${chunkSize} has been got.`,
                            );
                        }

                        data.data_chunk_size = chunkSize;
                    },
                },
                dataChunkType: {
                    get: () => data.data_compressed_chunk_type,
                },
                mode: {
                    get: () => data.mode,
                },
                bugTracker: {
                    get: () => data.bug_tracker,
                },
                _updateTrigger: {
                    get: () => updateTrigger,
                },
            }),
        );

        // When we call a function, for example: task.annotations.get()
        // In the method get we lose the task context
        // So, we need return it
        this.annotations = {
            get: Object.getPrototypeOf(this).annotations.get.bind(this),
            put: Object.getPrototypeOf(this).annotations.put.bind(this),
            save: Object.getPrototypeOf(this).annotations.save.bind(this),
            merge: Object.getPrototypeOf(this).annotations.merge.bind(this),
            split: Object.getPrototypeOf(this).annotations.split.bind(this),
            group: Object.getPrototypeOf(this).annotations.group.bind(this),
            clear: Object.getPrototypeOf(this).annotations.clear.bind(this),
            search: Object.getPrototypeOf(this).annotations.search.bind(this),
            searchEmpty: Object.getPrototypeOf(this).annotations.searchEmpty.bind(this),
            upload: Object.getPrototypeOf(this).annotations.upload.bind(this),
            select: Object.getPrototypeOf(this).annotations.select.bind(this),
            import: Object.getPrototypeOf(this).annotations.import.bind(this),
            export: Object.getPrototypeOf(this).annotations.export.bind(this),
            statistics: Object.getPrototypeOf(this).annotations.statistics.bind(this),
            hasUnsavedChanges: Object.getPrototypeOf(this).annotations.hasUnsavedChanges.bind(this),
            exportDataset: Object.getPrototypeOf(this).annotations.exportDataset.bind(this),
        };

        this.actions = {
            undo: Object.getPrototypeOf(this).actions.undo.bind(this),
            redo: Object.getPrototypeOf(this).actions.redo.bind(this),
            freeze: Object.getPrototypeOf(this).actions.freeze.bind(this),
            clear: Object.getPrototypeOf(this).actions.clear.bind(this),
            get: Object.getPrototypeOf(this).actions.get.bind(this),
        };

        this.frames = {
            get: Object.getPrototypeOf(this).frames.get.bind(this),
            delete: Object.getPrototypeOf(this).frames.delete.bind(this),
            restore: Object.getPrototypeOf(this).frames.restore.bind(this),
            save: Object.getPrototypeOf(this).frames.save.bind(this),
            ranges: Object.getPrototypeOf(this).frames.ranges.bind(this),
            preview: Object.getPrototypeOf(this).frames.preview.bind(this),
            search: Object.getPrototypeOf(this).frames.search.bind(this),
            contextImage: Object.getPrototypeOf(this).frames.contextImage.bind(this),
        };

        this.logger = {
            log: Object.getPrototypeOf(this).logger.log.bind(this),
        };

        this.predictor = {
            status: Object.getPrototypeOf(this).predictor.status.bind(this),
            predict: Object.getPrototypeOf(this).predictor.predict.bind(this),
        };
    }

    async save() {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.save);
        return result;
    }

    async issues() {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.issues);
        return result;
    }

    async openIssue(issue, message) {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.openIssue, issue, message);
        return result;
    }

    async close() {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.close);
        return result;
    }
}

export class Task extends Session {
    constructor(initialData) {
        super();
        const data = {
            id: undefined,
            name: undefined,
            project_id: null,
            status: undefined,
            size: undefined,
            mode: undefined,
            owner: null,
            assignee: null,
            created_date: undefined,
            updated_date: undefined,
            bug_tracker: undefined,
            subset: undefined,
            overlap: undefined,
            segment_size: undefined,
            image_quality: undefined,
            start_frame: undefined,
            stop_frame: undefined,
            frame_filter: undefined,
            data_chunk_size: undefined,
            data_compressed_chunk_type: undefined,
            data_original_chunk_type: undefined,
            deleted_frames: undefined,
            use_zip_chunks: undefined,
            use_cache: undefined,
            copy_data: undefined,
            dimension: undefined,
            cloud_storage_id: undefined,
            sorting_method: undefined,
            source_storage: undefined,
            target_storage: undefined,
            progress: undefined,
        };

        const updateTrigger = new FieldUpdateTrigger();

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        if (data.assignee) data.assignee = new User(data.assignee);
        if (data.owner) data.owner = new User(data.owner);

        data.labels = [];
        data.jobs = [];

        // FIX ME: progress shoud come from server, not from segments
        const progress = {
            completedJobs: 0,
            totalJobs: 0,
        };
        if (Array.isArray(initialData.segments)) {
            for (const segment of initialData.segments) {
                for (const job of segment.jobs) {
                    progress.totalJobs += 1;
                    if (job.stage === 'acceptance') progress.completedJobs += 1;
                }
            }
        }
        data.progress = progress;
        data.files = Object.freeze({
            server_files: [],
            client_files: [],
            remote_files: [],
        });

        if (Array.isArray(initialData.labels)) {
            data.labels = initialData.labels
                .map((labelData) => new Label(labelData)).filter((label) => !label.hasParent);
        }

        if (Array.isArray(initialData.jobs)) {
            for (const job of initialData.jobs) {
                const jobInstance = new Job({
                    url: job.url,
                    id: job.id,
                    assignee: job.assignee,
                    state: job.state,
                    stage: job.stage,
                    start_frame: job.start_frame,
                    stop_frame: job.stop_frame,
                    // following fields also returned when doing API request /jobs/<id>
                    // here we know them from task and append to constructor
                    task_id: data.id,
                    project_id: data.project_id,
                    labels: data.labels,
                    bug_tracker: data.bug_tracker,
                    mode: data.mode,
                    dimension: data.dimension,
                    data_compressed_chunk_type: data.data_compressed_chunk_type,
                    data_chunk_size: data.data_chunk_size,
                });

                data.jobs.push(jobInstance);
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                name: {
                    get: () => data.name,
                    set: (value) => {
                        if (!value.trim().length) {
                            throw new ArgumentError('Value must not be empty');
                        }
                        updateTrigger.update('name');
                        data.name = value;
                    },
                },
                projectId: {
                    get: () => data.project_id,
                    set: (projectId) => {
                        if (!Number.isInteger(projectId) || projectId <= 0) {
                            throw new ArgumentError('Value must be a positive integer');
                        }

                        updateTrigger.update('projectId');
                        data.project_id = projectId;
                    },
                },
                status: {
                    get: () => data.status,
                },
                size: {
                    get: () => data.size,
                },
                mode: {
                    get: () => data.mode,
                },
                owner: {
                    get: () => data.owner,
                },
                assignee: {
                    get: () => data.assignee,
                    set: (assignee) => {
                        if (assignee !== null && !(assignee instanceof User)) {
                            throw new ArgumentError('Value must be a user instance');
                        }
                        updateTrigger.update('assignee');
                        data.assignee = assignee;
                    },
                },
                createdDate: {
                    get: () => data.created_date,
                },
                updatedDate: {
                    get: () => data.updated_date,
                },
                bugTracker: {
                    get: () => data.bug_tracker,
                    set: (tracker) => {
                        if (typeof tracker !== 'string') {
                            throw new ArgumentError(
                                `Subset value must be a string. But ${typeof tracker} has been got.`,
                            );
                        }

                        updateTrigger.update('bugTracker');
                        data.bug_tracker = tracker;
                    },
                },
                subset: {
                    get: () => data.subset,
                    set: (subset) => {
                        if (typeof subset !== 'string') {
                            throw new ArgumentError(
                                `Subset value must be a string. But ${typeof subset} has been got.`,
                            );
                        }

                        updateTrigger.update('subset');
                        data.subset = subset;
                    },
                },
                overlap: {
                    get: () => data.overlap,
                    set: (overlap) => {
                        if (!Number.isInteger(overlap) || overlap < 0) {
                            throw new ArgumentError('Value must be a non negative integer');
                        }
                        data.overlap = overlap;
                    },
                },
                segmentSize: {
                    get: () => data.segment_size,
                    set: (segment) => {
                        if (!Number.isInteger(segment) || segment < 0) {
                            throw new ArgumentError('Value must be a positive integer');
                        }
                        data.segment_size = segment;
                    },
                },
                imageQuality: {
                    get: () => data.image_quality,
                    set: (quality) => {
                        if (!Number.isInteger(quality) || quality < 0) {
                            throw new ArgumentError('Value must be a positive integer');
                        }
                        data.image_quality = quality;
                    },
                },
                useZipChunks: {
                    get: () => data.use_zip_chunks,
                    set: (useZipChunks) => {
                        if (typeof useZipChunks !== 'boolean') {
                            throw new ArgumentError('Value must be a boolean');
                        }
                        data.use_zip_chunks = useZipChunks;
                    },
                },
                useCache: {
                    get: () => data.use_cache,
                    set: (useCache) => {
                        if (typeof useCache !== 'boolean') {
                            throw new ArgumentError('Value must be a boolean');
                        }
                        data.use_cache = useCache;
                    },
                },
                copyData: {
                    get: () => data.copy_data,
                    set: (copyData) => {
                        if (typeof copyData !== 'boolean') {
                            throw new ArgumentError('Value must be a boolean');
                        }
                        data.copy_data = copyData;
                    },
                },
                labels: {
                    get: () => data.labels.filter((_label) => !_label.deleted),
                    set: (labels) => {
                        if (!Array.isArray(labels)) {
                            throw new ArgumentError('Value must be an array of Labels');
                        }

                        for (const label of labels) {
                            if (!(label instanceof Label)) {
                                throw new ArgumentError(
                                    `Each array value must be an instance of Label. ${typeof label} was found`,
                                );
                            }
                        }

                        const IDs = labels.map((_label) => _label.id);
                        const deletedLabels = data.labels.filter((_label) => !IDs.includes(_label.id));
                        deletedLabels.forEach((_label) => {
                            _label.deleted = true;
                        });

                        updateTrigger.update('labels');
                        data.labels = [...deletedLabels, ...labels];
                    },
                },
                jobs: {
                    get: () => [...data.jobs],
                },
                serverFiles: {
                    get: () => [...data.files.server_files],
                    set: (serverFiles) => {
                        if (!Array.isArray(serverFiles)) {
                            throw new ArgumentError(
                                `Value must be an array. But ${typeof serverFiles} has been got.`,
                            );
                        }

                        for (const value of serverFiles) {
                            if (typeof value !== 'string') {
                                throw new ArgumentError(
                                    `Array values must be a string. But ${typeof value} has been got.`,
                                );
                            }
                        }

                        Array.prototype.push.apply(data.files.server_files, serverFiles);
                    },
                },
                clientFiles: {
                    get: () => [...data.files.client_files],
                    set: (clientFiles) => {
                        if (!Array.isArray(clientFiles)) {
                            throw new ArgumentError(
                                `Value must be an array. But ${typeof clientFiles} has been got.`,
                            );
                        }

                        for (const value of clientFiles) {
                            if (!(value instanceof File)) {
                                throw new ArgumentError(
                                    `Array values must be a File. But ${value.constructor.name} has been got.`,
                                );
                            }
                        }

                        Array.prototype.push.apply(data.files.client_files, clientFiles);
                    },
                },
                remoteFiles: {
                    get: () => [...data.files.remote_files],
                    set: (remoteFiles) => {
                        if (!Array.isArray(remoteFiles)) {
                            throw new ArgumentError(
                                `Value must be an array. But ${typeof remoteFiles} has been got.`,
                            );
                        }

                        for (const value of remoteFiles) {
                            if (typeof value !== 'string') {
                                throw new ArgumentError(
                                    `Array values must be a string. But ${typeof value} has been got.`,
                                );
                            }
                        }

                        Array.prototype.push.apply(data.files.remote_files, remoteFiles);
                    },
                },
                startFrame: {
                    get: () => data.start_frame,
                    set: (frame) => {
                        if (!Number.isInteger(frame) || frame < 0) {
                            throw new ArgumentError('Value must be a not negative integer');
                        }
                        data.start_frame = frame;
                    },
                },
                stopFrame: {
                    get: () => data.stop_frame,
                    set: (frame) => {
                        if (!Number.isInteger(frame) || frame < 0) {
                            throw new ArgumentError('Value must be a not negative integer');
                        }
                        data.stop_frame = frame;
                    },
                },
                frameFilter: {
                    get: () => data.frame_filter,
                    set: (filter) => {
                        if (typeof filter !== 'string') {
                            throw new ArgumentError(
                                `Filter value must be a string. But ${typeof filter} has been got.`,
                            );
                        }

                        data.frame_filter = filter;
                    },
                },
                dataChunkSize: {
                    get: () => data.data_chunk_size,
                    set: (chunkSize) => {
                        if (typeof chunkSize !== 'number' || chunkSize < 1) {
                            throw new ArgumentError(
                                `Chunk size value must be a positive number. But value ${chunkSize} has been got.`,
                            );
                        }

                        data.data_chunk_size = chunkSize;
                    },
                },
                dataChunkType: {
                    get: () => data.data_compressed_chunk_type,
                },
                dimension: {
                    get: () => data.dimension,
                },
                cloudStorageId: {
                    get: () => data.cloud_storage_id,
                },
                sortingMethod: {
                    get: () => data.sorting_method,
                },
                sourceStorage: {
                    get: () => (
                        new Storage({
                            location: data.source_storage?.location || StorageLocation.LOCAL,
                            cloudStorageId: data.source_storage?.cloud_storage_id,
                        })
                    ),
                },
                targetStorage: {
                    get: () => (
                        new Storage({
                            location: data.target_storage?.location || StorageLocation.LOCAL,
                            cloudStorageId: data.target_storage?.cloud_storage_id,
                        })
                    ),
                },
                progress: {
                    get: () => data.progress,
                },
                _internalData: {
                    get: () => data,
                },
                _updateTrigger: {
                    get: () => updateTrigger,
                },
            }),
        );

        // When we call a function, for example: task.annotations.get()
        // In the method get we lose the task context
        // So, we need return it
        this.annotations = {
            get: Object.getPrototypeOf(this).annotations.get.bind(this),
            put: Object.getPrototypeOf(this).annotations.put.bind(this),
            save: Object.getPrototypeOf(this).annotations.save.bind(this),
            merge: Object.getPrototypeOf(this).annotations.merge.bind(this),
            split: Object.getPrototypeOf(this).annotations.split.bind(this),
            group: Object.getPrototypeOf(this).annotations.group.bind(this),
            clear: Object.getPrototypeOf(this).annotations.clear.bind(this),
            search: Object.getPrototypeOf(this).annotations.search.bind(this),
            searchEmpty: Object.getPrototypeOf(this).annotations.searchEmpty.bind(this),
            upload: Object.getPrototypeOf(this).annotations.upload.bind(this),
            select: Object.getPrototypeOf(this).annotations.select.bind(this),
            import: Object.getPrototypeOf(this).annotations.import.bind(this),
            export: Object.getPrototypeOf(this).annotations.export.bind(this),
            statistics: Object.getPrototypeOf(this).annotations.statistics.bind(this),
            hasUnsavedChanges: Object.getPrototypeOf(this).annotations.hasUnsavedChanges.bind(this),
            exportDataset: Object.getPrototypeOf(this).annotations.exportDataset.bind(this),
        };

        this.actions = {
            undo: Object.getPrototypeOf(this).actions.undo.bind(this),
            redo: Object.getPrototypeOf(this).actions.redo.bind(this),
            freeze: Object.getPrototypeOf(this).actions.freeze.bind(this),
            clear: Object.getPrototypeOf(this).actions.clear.bind(this),
            get: Object.getPrototypeOf(this).actions.get.bind(this),
        };

        this.frames = {
            get: Object.getPrototypeOf(this).frames.get.bind(this),
            delete: Object.getPrototypeOf(this).frames.delete.bind(this),
            restore: Object.getPrototypeOf(this).frames.restore.bind(this),
            save: Object.getPrototypeOf(this).frames.save.bind(this),
            ranges: Object.getPrototypeOf(this).frames.ranges.bind(this),
            preview: Object.getPrototypeOf(this).frames.preview.bind(this),
            contextImage: Object.getPrototypeOf(this).frames.contextImage.bind(this),
            search: Object.getPrototypeOf(this).frames.search.bind(this),
        };

        this.logger = {
            log: Object.getPrototypeOf(this).logger.log.bind(this),
        };

        this.predictor = {
            status: Object.getPrototypeOf(this).predictor.status.bind(this),
            predict: Object.getPrototypeOf(this).predictor.predict.bind(this),
        };
    }

    async close() {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.close);
        return result;
    }

    async save(onUpdate = () => {}) {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.save, onUpdate);
        return result;
    }

    async delete() {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.delete);
        return result;
    }

    async backup(targetStorage: Storage, useDefaultSettings: boolean, fileName?: string) {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Task.prototype.backup,
            targetStorage,
            useDefaultSettings,
            fileName,
        );
        return result;
    }

    static async restore(storage: Storage, file: File | string) {
        const result = await PluginRegistry.apiWrapper.call(this, Task.restore, storage, file);
        return result;
    }
}

buildDuplicatedAPI(Job.prototype);
buildDuplicatedAPI(Task.prototype);
