// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';

import { ChunkQuality } from 'cvat-data';
import {
    ChunkType, DimensionType, HistoryActions, JobStage,
    JobState, JobType, StorageLocation, TaskMode, TaskStatus,
} from './enums';
import { Storage } from './storage';

import PluginRegistry from './plugins';
import { ArgumentError, ScriptingError } from './exceptions';
import { Label } from './labels';
import User from './user';
import { FieldUpdateTrigger } from './common';
import {
    SerializedCollection, SerializedJob,
    SerializedLabel, SerializedTask,
} from './server-response-types';
import AnnotationGuide from './guide';
import { FrameData, FramesMetaData } from './frames';
import Statistics from './statistics';
import { Request } from './request';
import logger from './logger';
import Issue from './issue';
import ObjectState from './object-state';
import { JobValidationLayout, TaskValidationLayout } from './validation-layout';
import { UpdateStatusData } from './core-types';

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

                async clear(options) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this, prototype.annotations.clear, options,
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

                async search(frameFrom, frameTo, searchParameters) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.search,
                        frameFrom,
                        frameTo,
                        searchParameters,
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

                async join(objectStates, points) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.join,
                        objectStates,
                        points,
                    );
                    return result;
                },

                async slice(objectState, results) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.slice,
                        objectState,
                        results,
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

                async commit(added, removed, frame) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.annotations.commit,
                        added,
                        removed,
                        frame,
                    );
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
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.save,
                    );
                    return result;
                },
                async cachedChunks() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.frames.cachedChunks);
                    return result;
                },
                async frameNumbers() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.frames.frameNumbers);
                    return result;
                },
                async preview() {
                    const result = await PluginRegistry.apiWrapper.call(this, prototype.frames.preview);
                    return result;
                },
                async search(filters, startFrame, stopFrame) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.search,
                        filters,
                        startFrame,
                        stopFrame,
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
                async chunk(chunkIndex, quality) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.frames.chunk,
                        chunkIndex,
                        quality,
                    );
                    return result;
                },
            },
            writable: true,
        }),
        logger: Object.freeze({
            value: {
                async log(scope, payload = {}, wait = false) {
                    const result = await PluginRegistry.apiWrapper.call(
                        this,
                        prototype.logger.log,
                        scope,
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
    });
}

export class Session {
    public annotations: {
        get: (frame: number, allTracks: boolean, filters: object[]) => Promise<ObjectState[]>;
        put: (objectStates: ObjectState[]) => Promise<number[]>;
        merge: (objectStates: ObjectState[]) => Promise<void>;
        split: (objectState: ObjectState, frame: number) => Promise<void>;
        group: (objectStates: ObjectState[], reset: boolean) => Promise<number>;
        join: (objectStates: ObjectState[], points: number[]) => Promise<void>;
        slice: (state: ObjectState, results: number[][]) => Promise<void>;
        clear: (options?: {
            reload?: boolean;
            startFrame?: number;
            stopFrame?: number;
            delTrackKeyframesOnly?: boolean;
        }) => Promise<void>;
        save: (
            onUpdate?: (message: string) => void,
        ) => Promise<void>;
        search: (
            frameFrom: number,
            frameTo: number,
            searchParameters: {
                allowDeletedFrames: boolean;
                annotationsFilters?: object[];
                generalFilters?: {
                    isEmptyFrame?: boolean;
                };
            },
        ) => Promise<number | null>;
        upload: (
            format: string,
            useDefaultSettings: boolean,
            sourceStorage: Storage,
            file: File | string,
            options?: {
                convMaskToPoly?: boolean,
                updateStatusCallback?: (s: string, n: number) => void,
            },
        ) => Promise<string>;
        select: (objectStates: ObjectState[], x: number, y: number) => Promise<{
            state: ObjectState,
            distance: number | null,
        }>;
        import: (data: Omit<SerializedCollection, 'version'>) => Promise<void>;
        export: () => Promise<Omit<SerializedCollection, 'version'>>;
        commit: (
            added: Omit<SerializedCollection, 'version'>,
            removed: Omit<SerializedCollection, 'version'>,
            frame: number,
        ) => Promise<void>;
        statistics: () => Promise<Statistics>;
        hasUnsavedChanges: () => boolean;
        exportDataset: (
            format: string,
            saveImages: boolean,
            useDefaultSettings: boolean,
            targetStorage: Storage,
            name?: string,
        ) => Promise<string | void>;
    };

    public actions: {
        undo: (count?: number) => Promise<number[]>;
        redo: (count?: number) => Promise<number[]>;
        freeze: (frozen: boolean) => Promise<void>;
        clear: () => Promise<void>;
        get: () => Promise<{ undo: [HistoryActions, number][], redo: [HistoryActions, number][] }>;
    };

    public frames: {
        get: (frame: number, isPlaying?: boolean, step?: number) => Promise<FrameData>;
        delete: (frame: number) => Promise<void>;
        restore: (frame: number) => Promise<void>;
        save: () => Promise<FramesMetaData[]>;
        cachedChunks: () => Promise<number[]>;
        frameNumbers: () => Promise<number[]>;
        preview: () => Promise<string>;
        contextImage: (frame: number) => Promise<Record<string, ImageBitmap>>;
        search: (
            filters: {
                offset?: number,
                notDeleted: boolean,
            },
            frameFrom: number,
            frameTo: number,
        ) => Promise<number | null>;
        chunk: (chunk: number, quality: ChunkQuality) => Promise<ArrayBuffer>;
    };

    public logger: {
        log: (
            scope: Parameters<typeof logger.log>[0],
            payload?: Parameters<typeof logger.log>[1],
            wait?: Parameters<typeof logger.log>[2],
        ) => ReturnType<typeof logger.log>;
    };

    public constructor() {
        if (this.constructor === Session) {
            throw new ScriptingError('Can not initiate an instance of abstract class');
        }

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
            join: Object.getPrototypeOf(this).annotations.join.bind(this),
            slice: Object.getPrototypeOf(this).annotations.slice.bind(this),
            clear: Object.getPrototypeOf(this).annotations.clear.bind(this),
            search: Object.getPrototypeOf(this).annotations.search.bind(this),
            upload: Object.getPrototypeOf(this).annotations.upload.bind(this),
            select: Object.getPrototypeOf(this).annotations.select.bind(this),
            import: Object.getPrototypeOf(this).annotations.import.bind(this),
            export: Object.getPrototypeOf(this).annotations.export.bind(this),
            commit: Object.getPrototypeOf(this).annotations.commit.bind(this),
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
            cachedChunks: Object.getPrototypeOf(this).frames.cachedChunks.bind(this),
            frameNumbers: Object.getPrototypeOf(this).frames.frameNumbers.bind(this),
            preview: Object.getPrototypeOf(this).frames.preview.bind(this),
            search: Object.getPrototypeOf(this).frames.search.bind(this),
            contextImage: Object.getPrototypeOf(this).frames.contextImage.bind(this),
            chunk: Object.getPrototypeOf(this).frames.chunk.bind(this),
        };

        this.logger = {
            log: Object.getPrototypeOf(this).logger.log.bind(this),
        };
    }
}

type InitializerType = Readonly<Partial<Omit<SerializedJob, 'labels'> & { labels?: SerializedLabel[] }>>;

export class Job extends Session {
    #data: {
        id?: number;
        assignee: User | null;
        stage?: JobStage;
        state?: JobState;
        type?: JobType;
        start_frame?: number;
        stop_frame?: number;
        frame_count?: number;
        project_id: number | null;
        guide_id: number | null;
        task_id: number;
        labels: Label[];
        dimension?: DimensionType;
        data_compressed_chunk_type?: ChunkType;
        data_chunk_size?: number;
        bug_tracker: string | null;
        mode?: TaskMode;
        created_date?: string,
        updated_date?: string,
        source_storage: Storage,
        target_storage: Storage,
        parent_job_id: number | null;
        consensus_replicas: number;
    };

    constructor(initialData: InitializerType) {
        super();

        this.#data = {
            id: undefined,
            assignee: null,
            stage: undefined,
            state: undefined,
            type: undefined,
            start_frame: undefined,
            stop_frame: undefined,
            frame_count: undefined,
            project_id: null,
            guide_id: null,
            task_id: null,
            labels: [],
            dimension: undefined,
            data_compressed_chunk_type: undefined,
            data_chunk_size: undefined,
            bug_tracker: null,
            mode: undefined,
            created_date: undefined,
            updated_date: undefined,
            source_storage: undefined,
            target_storage: undefined,
            parent_job_id: null,
            consensus_replicas: undefined,
        };

        this.#data.id = initialData.id ?? this.#data.id;
        this.#data.type = initialData.type ?? this.#data.type;
        this.#data.start_frame = initialData.start_frame ?? this.#data.start_frame;
        this.#data.stop_frame = initialData.stop_frame ?? this.#data.stop_frame;
        this.#data.frame_count = initialData.frame_count ?? this.#data.frame_count;
        this.#data.task_id = initialData.task_id ?? this.#data.task_id;
        this.#data.dimension = initialData.dimension ?? this.#data.dimension;
        this.#data.data_compressed_chunk_type =
            initialData.data_compressed_chunk_type ?? this.#data.data_compressed_chunk_type;
        this.#data.data_chunk_size = initialData.data_chunk_size ?? this.#data.data_chunk_size;
        this.#data.mode = initialData.mode ?? this.#data.mode;
        this.#data.created_date = initialData.created_date ?? this.#data.created_date;
        this.#data.parent_job_id = initialData.parent_job_id ?? this.#data.parent_job_id;
        this.#data.consensus_replicas = initialData.consensus_replicas ?? this.#data.consensus_replicas;

        if (Array.isArray(initialData.labels)) {
            this.#data.labels = initialData.labels.map((labelData) => {
                // can be already wrapped to the class
                // when create this job from Task constructor
                if (labelData instanceof Label) {
                    return labelData;
                }

                return new Label(labelData);
            }).filter((label) => !label.hasParent);
        }

        // to avoid code duplication set mutable field in the dedicated method
        this.reinit(initialData);
    }

    protected reinit(data: InitializerType): void {
        if (data.assignee?.id !== this.#data.assignee?.id) {
            if (data.assignee) {
                this.#data.assignee = new User(data.assignee);
            } else {
                this.#data.assignee = null;
            }
        }

        if (
            !this.#data.source_storage ||
            this.#data.source_storage.location !== data.source_storage?.location ||
            this.#data.source_storage.cloudStorageId !== data.source_storage?.cloud_storage_id
        ) {
            this.#data.source_storage = new Storage({
                location: data.source_storage?.location || StorageLocation.LOCAL,
                cloudStorageId: data.source_storage?.cloud_storage_id,
            });
        }

        if (
            !this.#data.target_storage ||
            this.#data.target_storage.location !== data.target_storage?.location ||
            this.#data.target_storage.cloudStorageId !== data.target_storage?.cloud_storage_id
        ) {
            this.#data.target_storage = new Storage({
                location: data.target_storage?.location || StorageLocation.LOCAL,
                cloudStorageId: data.target_storage?.cloud_storage_id,
            });
        }

        this.#data.stage = data.stage ?? this.#data.stage;
        this.#data.state = data.state ?? this.#data.state;
        this.#data.project_id = data.project_id ?? this.#data.project_id;
        this.#data.guide_id = data.guide_id ?? this.#data.guide_id;
        this.#data.updated_date = data.updated_date ?? this.#data.updated_date;
        this.#data.bug_tracker = data.bug_tracker ?? this.#data.bug_tracker;

        // TODO: labels also may get changed, but it will affect many code within the application
        // so, need to think on this additionally
    }

    public get assignee(): User | null {
        return this.#data.assignee;
    }

    public get stage(): JobStage {
        return this.#data.stage;
    }

    public get state(): JobState {
        return this.#data.state;
    }

    public get id(): number {
        return this.#data.id;
    }

    public get startFrame(): number {
        return this.#data.start_frame;
    }

    public get stopFrame(): number {
        return this.#data.stop_frame;
    }

    public get frameCount(): number {
        return this.#data.frame_count;
    }

    public get projectId(): number | null {
        return this.#data.project_id;
    }

    public get guideId(): number | null {
        return this.#data.guide_id;
    }

    public get taskId(): number {
        return this.#data.task_id;
    }

    public get dimension(): DimensionType {
        return this.#data.dimension;
    }

    public get parentJobId(): number | null {
        return this.#data.parent_job_id;
    }

    public get consensusReplicas(): number {
        return this.#data.consensus_replicas;
    }

    public get dataChunkType(): ChunkType {
        return this.#data.data_compressed_chunk_type;
    }

    public get dataChunkSize(): number {
        return this.#data.data_chunk_size;
    }

    public get bugTracker(): string | null {
        return this.#data.bug_tracker;
    }

    public get mode(): TaskMode {
        return this.#data.mode;
    }

    public get labels(): Label[] {
        return [...this.#data.labels];
    }

    public get type(): JobType {
        return this.#data.type;
    }

    public get createdDate(): string {
        return this.#data.created_date;
    }

    public get updatedDate(): string {
        return this.#data.updated_date;
    }

    public get sourceStorage(): Storage {
        return this.#data.source_storage;
    }

    public get targetStorage(): Storage {
        return this.#data.target_storage;
    }

    async save(fields: Record<string, any> = {}): Promise<Job> {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.save, fields);
        return result;
    }

    async issues(): Promise<Issue[]> {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.issues);
        return result;
    }

    async guide(): Promise<AnnotationGuide | null> {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.guide);
        return result;
    }

    async validationLayout(): Promise<JobValidationLayout | null> {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.validationLayout);
        return result;
    }

    async openIssue(issue: Issue, message: string): Promise<Issue> {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.openIssue, issue, message);
        return result;
    }

    async close(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.close);
        return result;
    }

    async delete(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Job.prototype.delete);
        return result;
    }
}

export class Task extends Session {
    public name: string;
    public projectId: number | null;
    public assignee: User | null;
    public bugTracker: string;
    public subset: string;
    public labels: Label[];
    public readonly guideId: number | null;
    public readonly id: number;
    public readonly status: TaskStatus;
    public readonly size: number;
    public readonly mode: TaskMode;
    public readonly owner: User;
    public readonly createdDate: string;
    public readonly updatedDate: string;
    public readonly overlap: number | null;
    public readonly segmentSize: number;
    public readonly imageQuality: number;
    public readonly dataChunkSize: number;
    public readonly dataChunkType: ChunkType;
    public readonly dimension: DimensionType;
    public readonly sourceStorage: Storage;
    public readonly targetStorage: Storage;
    public readonly organization: number | null;
    public readonly progress: { count: number; completed: number };
    public readonly jobs: Job[];
    public readonly consensusEnabled: boolean;

    public readonly startFrame: number;
    public readonly stopFrame: number;
    public readonly frameFilter: string;
    public readonly useZipChunks: boolean;
    public readonly useCache: boolean;
    public readonly copyData: boolean;
    public readonly cloudStorageId: number;
    public readonly sortingMethod: string;

    public readonly validationMode: string | null;
    public readonly validationFramesPercent: number;
    public readonly validationFramesPerJobPercent: number;
    public readonly frameSelectionMethod: string;

    constructor(initialData: Readonly<Omit<SerializedTask, 'labels' | 'jobs'> & {
        labels?: SerializedLabel[];
        progress?: SerializedTask['jobs'];
        jobs?: SerializedJob[];
    }>) {
        super();

        const data = {
            id: undefined,
            name: undefined,
            project_id: null,
            guide_id: undefined,
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
            data_chunk_size: undefined,
            data_compressed_chunk_type: undefined,
            data_original_chunk_type: undefined,
            dimension: undefined,
            source_storage: undefined,
            target_storage: undefined,
            organization: undefined,
            progress: undefined,
            labels: undefined,
            jobs: undefined,

            start_frame: undefined,
            stop_frame: undefined,
            frame_filter: undefined,
            use_zip_chunks: undefined,
            use_cache: undefined,
            copy_data: undefined,
            cloud_storage_id: undefined,
            sorting_method: undefined,
            files: undefined,
            consensus_enabled: undefined,

            validation_mode: null,
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

        data.progress = {
            completedJobs: initialData.progress?.completed || 0,
            totalJobs: initialData.progress?.count || 0,
            validationJobs: initialData.progress?.validation || 0,
            annotationJobs:
                (initialData.progress?.count || 0) -
                (initialData.progress?.validation || 0) -
                (initialData.progress?.completed || 0),
        };

        data.files = Object.freeze({
            server_files: [],
            client_files: [],
            remote_files: [],
        });

        if (Array.isArray(initialData.labels)) {
            data.labels = initialData.labels
                .map((labelData) => new Label(labelData)).filter((label) => !label.hasParent);
        }

        data.source_storage = new Storage({
            location: initialData.source_storage?.location || StorageLocation.LOCAL,
            cloudStorageId: initialData.source_storage?.cloud_storage_id,
        });

        data.target_storage = new Storage({
            location: initialData.target_storage?.location || StorageLocation.LOCAL,
            cloudStorageId: initialData.target_storage?.cloud_storage_id,
        });

        if (Array.isArray(initialData.jobs)) {
            for (const job of initialData.jobs) {
                const jobInstance = new Job({
                    url: job.url,
                    id: job.id,
                    assignee: job.assignee,
                    state: job.state,
                    stage: job.stage,
                    type: job.type,
                    start_frame: job.start_frame,
                    stop_frame: job.stop_frame,
                    frame_count: job.frame_count,
                    guide_id: job.guide_id,
                    issues: job.issues,
                    updated_date: job.updated_date,
                    created_date: job.created_date,
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
                    target_storage: initialData.target_storage,
                    source_storage: initialData.source_storage,
                    parent_job_id: job.parent_job_id,
                    consensus_replicas: job.consensus_replicas,
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
                guideId: {
                    get: () => data.guide_id,
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
                },
                segmentSize: {
                    get: () => data.segment_size,
                },
                imageQuality: {
                    get: () => data.image_quality,
                },
                useZipChunks: {
                    get: () => data.use_zip_chunks,
                },
                useCache: {
                    get: () => data.use_cache,
                },
                copyData: {
                    get: () => data.copy_data,
                },
                consensusEnabled: {
                    get: () => data.consensus_enabled,
                },
                labels: {
                    get: () => [...data.labels],
                    set: (labels: Label[]) => {
                        if (!Array.isArray(labels)) {
                            throw new ArgumentError('Value must be an array of Labels');
                        }

                        if (!Array.isArray(labels) || labels.some((label) => !(label instanceof Label))) {
                            throw new ArgumentError(
                                'Each array value must be an instance of Label',
                            );
                        }

                        const oldIDs = data.labels.map((_label) => _label.id);
                        const newIDs = labels.map((_label) => _label.id);

                        // find any deleted labels and mark them
                        data.labels.filter((_label) => !newIDs.includes(_label.id))
                            .forEach((_label) => {
                                // for deleted labels let's specify that they are deleted
                                _label.deleted = true;
                            });

                        // find any patched labels and mark them
                        labels.forEach((_label) => {
                            const { id } = _label;
                            if (oldIDs.includes(id)) {
                                const oldLabelIndex = data.labels.findIndex((__label) => __label.id === id);
                                if (oldLabelIndex !== -1) {
                                    // replace current label by the patched one
                                    const oldLabel = data.labels[oldLabelIndex];
                                    data.labels.splice(oldLabelIndex, 1, _label);
                                    if (!_.isEqual(_label.toJSON(), oldLabel.toJSON())) {
                                        _label.patched = true;
                                    }
                                }
                            }
                        });

                        // find new labels to append them to the end
                        const newLabels = labels.filter((_label) => !Number.isInteger(_label.id));
                        data.labels = [...data.labels, ...newLabels];

                        updateTrigger.update('labels');
                    },
                },
                jobs: {
                    get: () => [...(data.jobs || [])],
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
                frameFilter: {
                    get: () => data.frame_filter,
                },
                startFrame: {
                    get: () => data.start_frame,
                },
                stopFrame: {
                    get: () => data.stop_frame,
                },
                dataChunkSize: {
                    get: () => data.data_chunk_size,
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
                organization: {
                    get: () => data.organization,
                },
                sourceStorage: {
                    get: () => data.source_storage,
                },
                targetStorage: {
                    get: () => data.target_storage,
                },
                progress: {
                    get: () => data.progress,
                },
                validationMode: {
                    get: () => data.validation_mode,
                },
                _internalData: {
                    get: () => data,
                },
                _updateTrigger: {
                    get: () => updateTrigger,
                },
            }),
        );
    }

    async close(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.close);
        return result;
    }

    async save(
        fields: Record<string, any> = {},
        options?: { updateStatusCallback?: (updateData: Request | UpdateStatusData) => void },
    ): Promise<Task> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.save, fields, options);
        return result;
    }

    async listenToCreate(
        rqID,
        options,
    ): Promise<Task> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.listenToCreate, rqID, options);
        return result;
    }

    async delete(): Promise<void> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.delete);
        return result;
    }

    async backup(targetStorage: Storage, useDefaultSettings: boolean, fileName?: string): Promise<string | void> {
        const result = await PluginRegistry.apiWrapper.call(
            this,
            Task.prototype.backup,
            targetStorage,
            useDefaultSettings,
            fileName,
        );
        return result;
    }

    async issues(): Promise<Issue[]> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.issues);
        return result;
    }

    static async restore(storage: Storage, file: File | string): Promise<string> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.restore, storage, file);
        return result;
    }

    async guide(): Promise<AnnotationGuide | null> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.guide);
        return result;
    }

    async validationLayout(): Promise<TaskValidationLayout | null> {
        const result = await PluginRegistry.apiWrapper.call(this, Task.prototype.validationLayout);
        return result;
    }
}

buildDuplicatedAPI(Job.prototype);
buildDuplicatedAPI(Task.prototype);
