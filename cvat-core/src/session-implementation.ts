// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
import { ArgumentError } from './exceptions';
import { HistoryActions, JobType, RQStatus } from './enums';
import { Storage } from './storage';
import { Task as TaskClass, Job as JobClass } from './session';
import logger from './logger';
import serverProxy from './server-proxy';
import {
    getFrame,
    deleteFrame,
    restoreFrame,
    getCachedChunks,
    clear as clearFrames,
    findFrame,
    getContextImage,
    patchMeta,
    getDeletedFrames,
    decodePreview,
} from './frames';
import Issue from './issue';
import { SerializedLabel, SerializedTask } from './server-response-types';
import { checkObjectType } from './common';
import {
    getCollection, getSaver, clearAnnotations, getAnnotations,
    importDataset, exportDataset, clearCache, getHistory,
} from './annotations';
import AnnotationGuide from './guide';

// must be called with task/job context
async function deleteFrameWrapper(jobID, frame): Promise<void> {
    const redo = async (): Promise<void> => {
        deleteFrame(jobID, frame);
    };

    await redo();
    getHistory(this).do(HistoryActions.REMOVED_FRAME, async () => {
        restoreFrame(jobID, frame);
    }, redo, [], frame);
}

async function restoreFrameWrapper(jobID, frame): Promise<void> {
    const redo = async (): Promise<void> => {
        restoreFrame(jobID, frame);
    };

    await redo();
    getHistory(this).do(HistoryActions.RESTORED_FRAME, async () => {
        deleteFrame(jobID, frame);
    }, redo, [], frame);
}

export function implementJob(Job: typeof JobClass): typeof JobClass {
    Object.defineProperty(Job.prototype.save, 'implementation', {
        value: async function saveImplementation(
            this: JobClass,
            additionalData: any,
        ): ReturnType<typeof Job.prototype.save> {
            if (this.id) {
                const jobData = this._updateTrigger.getUpdated(this);
                if (jobData.assignee) {
                    jobData.assignee = jobData.assignee.id;
                }

                let updatedJob = null;
                try {
                    const data = await serverProxy.jobs.save(this.id, jobData);
                    updatedJob = new Job(data);
                } catch (error) {
                    updatedJob = new Job(this._initialData);
                    throw error;
                } finally {
                    this.stage = updatedJob.stage;
                    this.state = updatedJob.state;
                    this.assignee = updatedJob.assignee;
                    this._updateTrigger.reset();
                }

                return this;
            }

            const jobSpec = {
                ...(this.assignee ? { assignee: this.assignee.id } : {}),
                ...(this.stage ? { stage: this.stage } : {}),
                ...(this.state ? { stage: this.state } : {}),
                type: this.type,
                task_id: this.taskId,
            };
            const job = await serverProxy.jobs.create({ ...jobSpec, ...additionalData });
            return new Job(job);
        },
    });

    Object.defineProperty(Job.prototype.delete, 'implementation', {
        value: async function deleteImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.delete> {
            if (this.type !== JobType.GROUND_TRUTH) {
                throw new Error('Only ground truth job can be deleted');
            }

            return serverProxy.jobs.delete(this.id);
        },
    });

    Object.defineProperty(Job.prototype.issues, 'implementation', {
        value: async function issuesImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.issues> {
            const result = await serverProxy.issues.get({ job_id: this.id });
            return result.map((issue) => new Issue(issue));
        },
    });

    Object.defineProperty(Job.prototype.openIssue, 'implementation', {
        value: async function openIssueImplementation(
            this: JobClass,
            issue: Issue,
            message: string,
        ): ReturnType<typeof Job.prototype.openIssue> {
            checkObjectType('issue', issue, null, Issue);
            checkObjectType('message', message, 'string');
            const result = await serverProxy.issues.create({
                ...issue.serialize(),
                message,
            });
            return new Issue(result);
        },
    });

    Object.defineProperty(Job.prototype.close, 'implementation', {
        value: function closeImplementation(
            this: JobClass,
        ) {
            clearFrames(this.id);
            clearCache(this);
        },
    });

    Object.defineProperty(Job.prototype.guide, 'implementation', {
        value: async function guideImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.guide> {
            if (this.guideId === null) {
                return null;
            }

            const result = await serverProxy.guides.get(this.guideId);
            return new AnnotationGuide(result);
        },
    });

    Object.defineProperty(Job.prototype.frames.get, 'implementation', {
        value: function getFrameImplementation(
            this: JobClass,
            frame: Parameters<typeof Job.prototype.frames.get>[0],
            isPlaying: Parameters<typeof Job.prototype.frames.get>[1],
            step: Parameters<typeof Job.prototype.frames.get>[2],
        ): ReturnType<typeof Job.prototype.frames.get> {
            if (!Number.isInteger(frame) || frame < 0) {
                throw new ArgumentError(`Frame must be a positive integer. Got: "${frame}"`);
            }

            if (frame < this.startFrame || frame > this.stopFrame) {
                throw new ArgumentError(`The frame with number ${frame} is out of the job`);
            }

            return getFrame(
                this.id,
                this.dataChunkSize,
                this.dataChunkType,
                this.mode,
                frame,
                this.startFrame,
                this.stopFrame,
                isPlaying,
                step,
                this.dimension,
                (chunkNumber, quality) => this.frames.chunk(chunkNumber, quality),
            );
        },
    });

    Object.defineProperty(Job.prototype.frames.delete, 'implementation', {
        value: async function deleteFrameImplementation(
            this: JobClass,
            frame: Parameters<typeof Job.prototype.frames.delete>[0],
        ): ReturnType<typeof Job.prototype.frames.delete> {
            if (!Number.isInteger(frame)) {
                throw new Error(`Frame must be an integer. Got: "${frame}"`);
            }

            if (frame < this.startFrame || frame > this.stopFrame) {
                throw new Error('The frame is out of the job');
            }

            return deleteFrameWrapper.call(this, this.id, frame);
        },
    });

    Object.defineProperty(Job.prototype.frames.restore, 'implementation', {
        value: async function restoreFrameImplementation(
            this: JobClass,
            frame: Parameters<typeof Job.prototype.frames.restore>[0],
        ): ReturnType<typeof Job.prototype.frames.restore> {
            if (!Number.isInteger(frame)) {
                throw new Error(`Frame must be an integer. Got: "${frame}"`);
            }

            if (frame < this.startFrame || frame > this.stopFrame) {
                throw new Error('The frame is out of the job');
            }

            return restoreFrameWrapper.call(this, this.id, frame);
        },
    });

    Object.defineProperty(Job.prototype.frames.save, 'implementation', {
        value: function saveFramesImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.frames.save> {
            return patchMeta(this.id);
        },
    });

    Object.defineProperty(Job.prototype.frames.cachedChunks, 'implementation', {
        value: function cachedChunksImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.frames.cachedChunks> {
            return Promise.resolve(getCachedChunks(this.id));
        },
    });

    Object.defineProperty(Job.prototype.frames.preview, 'implementation', {
        value: function previewImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.frames.preview> {
            if (this.id === null || this.taskId === null) {
                return Promise.resolve('');
            }

            return serverProxy.jobs.getPreview(this.id).then((preview) => {
                if (!preview) {
                    return Promise.resolve('');
                }
                return decodePreview(preview);
            });
        },
    });

    Object.defineProperty(Job.prototype.frames.contextImage, 'implementation', {
        value: function contextImageImplementation(
            this: JobClass,
            frameId: Parameters<typeof Job.prototype.frames.contextImage>[0],
        ): ReturnType<typeof Job.prototype.frames.contextImage> {
            return getContextImage(this.id, frameId);
        },
    });

    Object.defineProperty(Job.prototype.frames.chunk, 'implementation', {
        value: function chunkImplementation(
            this: JobClass,
            chunkNumber: Parameters<typeof Job.prototype.frames.chunk>[0],
            quality: Parameters<typeof Job.prototype.frames.chunk>[1],
        ): ReturnType<typeof Job.prototype.frames.chunk> {
            return serverProxy.frames.getData(this.id, chunkNumber, quality);
        },
    });

    Object.defineProperty(Job.prototype.frames.search, 'implementation', {
        value: function searchFrameImplementation(
            this: JobClass,
            filters: Parameters<typeof Job.prototype.frames.search>[0],
            frameFrom: Parameters<typeof Job.prototype.frames.search>[1],
            frameTo: Parameters<typeof Job.prototype.frames.search>[2],
        ): ReturnType<typeof Job.prototype.frames.search> {
            if (typeof filters !== 'object') {
                throw new ArgumentError('Filters should be an object');
            }

            if (!Number.isInteger(frameFrom) || !Number.isInteger(frameTo)) {
                throw new ArgumentError('The start and end frames both must be an integer');
            }

            if (frameFrom < this.startFrame || frameFrom > this.stopFrame) {
                throw new ArgumentError('The start frame is out of the job');
            }

            if (frameTo < this.startFrame || frameTo > this.stopFrame) {
                throw new ArgumentError('The stop frame is out of the job');
            }

            return findFrame(this.id, frameFrom, frameTo, filters);
        },
    });

    Object.defineProperty(Job.prototype.annotations.get, 'implementation', {
        value: async function getAnnotationsImplementation(
            this: JobClass,
            frame: Parameters<typeof Job.prototype.annotations.get>[0],
            allTracks: Parameters<typeof Job.prototype.annotations.get>[1],
            filters: Parameters<typeof Job.prototype.annotations.get>[2],
        ): Promise<ReturnType<typeof Job.prototype.annotations.get>> {
            if (!Array.isArray(filters)) {
                throw new ArgumentError('Filters must be an array');
            }

            if (!Number.isInteger(frame)) {
                throw new ArgumentError('The frame argument must be an integer');
            }

            if (frame < this.startFrame || frame > this.stopFrame) {
                throw new ArgumentError(`Frame ${frame} does not exist in the job`);
            }

            const annotationsData = await getAnnotations(this, frame, allTracks, filters);
            const deletedFrames = await getDeletedFrames('job', this.id);
            if (frame in deletedFrames) {
                return [];
            }

            return annotationsData;
        },
    });

    Object.defineProperty(Job.prototype.annotations.search, 'implementation', {
        value: function searchAnnotationsImplementation(
            this: JobClass,
            frameFrom: Parameters<typeof Job.prototype.annotations.search>[0],
            frameTo: Parameters<typeof Job.prototype.annotations.search>[1],
            searchParameters: Parameters<typeof Job.prototype.annotations.search>[2],
        ): ReturnType<typeof Job.prototype.annotations.search> {
            if ('annotationsFilters' in searchParameters && !Array.isArray(searchParameters.annotationsFilters)) {
                throw new ArgumentError('Annotations filters must be an array');
            }

            if ('generalFilters' in searchParameters && typeof searchParameters.generalFilters.isEmptyFrame !== 'boolean') {
                throw new ArgumentError('General filter isEmptyFrame must be a boolean');
            }

            if ('annotationsFilters' in searchParameters && 'generalFilters' in searchParameters) {
                throw new ArgumentError('Both annotations filters and general fiters could not be used together');
            }

            if (!Number.isInteger(frameFrom) || !Number.isInteger(frameTo)) {
                throw new ArgumentError('The start and end frames both must be an integer');
            }

            if (frameFrom < this.startFrame || frameFrom > this.stopFrame) {
                throw new ArgumentError('The start frame is out of the job');
            }

            if (frameTo < this.startFrame || frameTo > this.stopFrame) {
                throw new ArgumentError('The stop frame is out of the job');
            }

            return Promise.resolve(
                getCollection(this).search(frameFrom, frameTo, searchParameters),
            );
        },
    });

    Object.defineProperty(Job.prototype.annotations.save, 'implementation', {
        value: async function saveAnnotationsImplementation(
            this: JobClass,
            onUpdate: Parameters<typeof Job.prototype.annotations.save>[0],
        ): ReturnType<typeof Job.prototype.annotations.save> {
            return getSaver(this).save(onUpdate);
        },
    });

    Object.defineProperty(Job.prototype.annotations.merge, 'implementation', {
        value: function mergeAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof Job.prototype.annotations.merge>[0],
        ): ReturnType<typeof Job.prototype.annotations.merge> {
            return Promise.resolve(getCollection(this).merge(objectStates));
        },
    });

    Object.defineProperty(Job.prototype.annotations.split, 'implementation', {
        value: function splitAnnotationsImplementation(
            this: JobClass,
            objectState: Parameters<typeof Job.prototype.annotations.split>[0],
            frame: Parameters<typeof Job.prototype.annotations.split>[1],
        ): ReturnType<typeof Job.prototype.annotations.split> {
            return Promise.resolve(getCollection(this).split(objectState, frame));
        },
    });

    Object.defineProperty(Job.prototype.annotations.group, 'implementation', {
        value: function groupAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof Job.prototype.annotations.group>[0],
            reset: Parameters<typeof Job.prototype.annotations.group>[1],
        ): ReturnType<typeof Job.prototype.annotations.group> {
            return Promise.resolve(getCollection(this).group(objectStates, reset));
        },
    });

    Object.defineProperty(Job.prototype.annotations.join, 'implementation', {
        value: function joinAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof Job.prototype.annotations.join>[0],
            points: Parameters<typeof Job.prototype.annotations.join>[1],
        ): ReturnType<typeof Job.prototype.annotations.join> {
            return Promise.resolve(getCollection(this).join(objectStates, points));
        },
    });

    Object.defineProperty(Job.prototype.annotations.slice, 'implementation', {
        value: function sliceAnnotationsImplementation(
            this: JobClass,
            objectState: Parameters<typeof Job.prototype.annotations.slice>[0],
            results: Parameters<typeof Job.prototype.annotations.slice>[1],
        ): ReturnType<typeof Job.prototype.annotations.slice> {
            return Promise.resolve(getCollection(this).slice(objectState, results));
        },
    });

    Object.defineProperty(Job.prototype.annotations.hasUnsavedChanges, 'implementation', {
        value: function hasUnsavedChangesImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.annotations.hasUnsavedChanges> {
            return getSaver(this).hasUnsavedChanges();
        },
    });

    Object.defineProperty(Job.prototype.annotations.clear, 'implementation', {
        value: async function clearAnnotationsImplementation(
            this: JobClass,
            flags: Parameters<typeof Job.prototype.annotations.clear>[0],
        ): ReturnType<typeof Job.prototype.annotations.clear> {
            return clearAnnotations(this, flags);
        },
    });

    Object.defineProperty(Job.prototype.annotations.select, 'implementation', {
        value: function selectAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof Job.prototype.annotations.select>[0],
            x: Parameters<typeof Job.prototype.annotations.select>[1],
            y: Parameters<typeof Job.prototype.annotations.select>[2],
        ): ReturnType<typeof Job.prototype.annotations.select> {
            return Promise.resolve(getCollection(this).select(objectStates, x, y));
        },
    });

    Object.defineProperty(Job.prototype.annotations.statistics, 'implementation', {
        value: function statisticsImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.annotations.statistics> {
            return Promise.resolve(getCollection(this).statistics());
        },
    });

    Object.defineProperty(Job.prototype.annotations.put, 'implementation', {
        value: function putAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof Job.prototype.annotations.put>[0],
        ): ReturnType<typeof Job.prototype.annotations.put> {
            return Promise.resolve(getCollection(this).put(objectStates));
        },
    });

    Object.defineProperty(Job.prototype.annotations.import, 'implementation', {
        value: function importAnnotationsImplementation(
            this: JobClass,
            data: Parameters<typeof Job.prototype.annotations.import>[0],
        ): ReturnType<typeof Job.prototype.annotations.import> {
            getCollection(this).import(data);
            return Promise.resolve();
        },
    });

    Object.defineProperty(Job.prototype.annotations.export, 'implementation', {
        value: function exportAnnotationsImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.annotations.export> {
            return Promise.resolve(getCollection(this).export());
        },
    });

    Object.defineProperty(Job.prototype.annotations.upload, 'implementation', {
        value: async function uploadAnnotationsImplementation(
            this: JobClass,
            format: Parameters<typeof Job.prototype.annotations.upload>[0],
            useDefaultLocation: Parameters<typeof Job.prototype.annotations.upload>[1],
            sourceStorage: Parameters<typeof Job.prototype.annotations.upload>[2],
            file: Parameters<typeof Job.prototype.annotations.upload>[3],
            options: Parameters<typeof Job.prototype.annotations.upload>[4],
        ): ReturnType<typeof Job.prototype.annotations.upload> {
            return importDataset(this, format, useDefaultLocation, sourceStorage, file, options);
        },
    });

    Object.defineProperty(Job.prototype.annotations.exportDataset, 'implementation', {
        value: async function exportDatasetImplementation(
            this: JobClass,
            format: Parameters<typeof Job.prototype.annotations.exportDataset>[0],
            saveImages: Parameters<typeof Job.prototype.annotations.exportDataset>[1],
            useDefaultSettings: Parameters<typeof Job.prototype.annotations.exportDataset>[2],
            targetStorage: Parameters<typeof Job.prototype.annotations.exportDataset>[3],
            customName?: Parameters<typeof Job.prototype.annotations.exportDataset>[4],
        ): ReturnType<typeof Job.prototype.annotations.exportDataset> {
            return exportDataset(this, format, saveImages, useDefaultSettings, targetStorage, customName);
        },
    });

    Object.defineProperty(Job.prototype.actions.undo, 'implementation', {
        value: async function undoActionImplementation(
            this: JobClass,
            count: Parameters<typeof Job.prototype.actions.undo>[0],
        ): ReturnType<typeof Job.prototype.actions.undo> {
            return getHistory(this).undo(count);
        },
    });

    Object.defineProperty(Job.prototype.actions.redo, 'implementation', {
        value: async function redoActionImplementation(
            this: JobClass,
            count: Parameters<typeof Job.prototype.actions.redo>[0],
        ): ReturnType<typeof Job.prototype.actions.redo> {
            return getHistory(this).redo(count);
        },
    });

    Object.defineProperty(Job.prototype.actions.freeze, 'implementation', {
        value: function freezeActionsImplementation(
            this: JobClass,
            frozen: Parameters<typeof Job.prototype.actions.freeze>[0],
        ): ReturnType<typeof Job.prototype.actions.freeze> {
            return getHistory(this).freeze(frozen);
        },
    });

    Object.defineProperty(Job.prototype.actions.clear, 'implementation', {
        value: function clearActionsImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.actions.clear> {
            return getHistory(this).clear();
        },
    });

    Object.defineProperty(Job.prototype.actions.get, 'implementation', {
        value: function getActionsImplementation(
            this: JobClass,
        ): ReturnType<typeof Job.prototype.actions.get> {
            return getHistory(this).get();
        },
    });

    Object.defineProperty(Job.prototype.logger.log, 'implementation', {
        value: async function logImplementation(
            this: JobClass,
            scope: Parameters<typeof Job.prototype.logger.log>[0],
            payload: Parameters<typeof Job.prototype.logger.log>[1],
            wait: Parameters<typeof Job.prototype.logger.log>[2],
        ): ReturnType<typeof Job.prototype.logger.log> {
            return logger.log(
                scope,
                {
                    ...payload,
                    project_id: this.projectId,
                    task_id: this.taskId,
                    job_id: this.id,
                },
                wait,
            );
        },
    });

    return Job;
}

export function implementTask(Task: typeof TaskClass) {
    Task.prototype.close.implementation = function closeTask() {
        for (const job of this.jobs) {
            clearFrames(job.id);
            clearCache(job);
        }

        clearCache(this);
        return this;
    };

    Task.prototype.save.implementation = async function (onUpdate) {
        if (typeof this.id !== 'undefined') {
            // If the task has been already created, we update it
            const taskData = this._updateTrigger.getUpdated(this, {
                bugTracker: 'bug_tracker',
                projectId: 'project_id',
                assignee: 'assignee_id',
            });

            if (taskData.assignee_id) {
                taskData.assignee_id = taskData.assignee_id.id;
            }

            for await (const label of taskData.labels || []) {
                if (label.deleted) {
                    await serverProxy.labels.delete(label.id);
                } else if (label.patched) {
                    await serverProxy.labels.update(label.id, label.toJSON());
                }
            }

            // leave only new labels to create them via task PATCH request
            taskData.labels = (taskData.labels || [])
                .filter((label: SerializedLabel) => !Number.isInteger(label.id)).map((el) => el.toJSON());
            if (!taskData.labels.length) {
                delete taskData.labels;
            }

            this._updateTrigger.reset();

            let serializedTask: SerializedTask = null;
            if (Object.keys(taskData).length) {
                serializedTask = await serverProxy.tasks.save(this.id, taskData);
            } else {
                [serializedTask] = (await serverProxy.tasks.get({ id: this.id }));
            }

            const labels = await serverProxy.labels.get({ task_id: this.id });
            const jobs = await serverProxy.jobs.get({ task_id: this.id }, true);
            return new Task({
                ...omit(serializedTask, ['jobs', 'labels']),
                progress: serializedTask.jobs,
                jobs,
                labels: labels.results,
            });
        }

        const taskSpec: any = {
            name: this.name,
            labels: this.labels.map((el) => el.toJSON()),
        };

        if (typeof this.bugTracker !== 'undefined') {
            taskSpec.bug_tracker = this.bugTracker;
        }
        if (typeof this.segmentSize !== 'undefined') {
            taskSpec.segment_size = this.segmentSize;
        }
        if (typeof this.overlap !== 'undefined') {
            taskSpec.overlap = this.overlap;
        }
        if (typeof this.projectId !== 'undefined') {
            taskSpec.project_id = this.projectId;
        }
        if (typeof this.subset !== 'undefined') {
            taskSpec.subset = this.subset;
        }

        if (this.targetStorage) {
            taskSpec.target_storage = this.targetStorage.toJSON();
        }

        if (this.sourceStorage) {
            taskSpec.source_storage = this.sourceStorage.toJSON();
        }

        const taskDataSpec = {
            client_files: this.clientFiles,
            server_files: this.serverFiles,
            remote_files: this.remoteFiles,
            image_quality: this.imageQuality,
            use_zip_chunks: this.useZipChunks,
            use_cache: this.useCache,
            sorting_method: this.sortingMethod,
            ...(typeof this.startFrame !== 'undefined' ? { start_frame: this.startFrame } : {}),
            ...(typeof this.stopFrame !== 'undefined' ? { stop_frame: this.stopFrame } : {}),
            ...(typeof this.frameFilter !== 'undefined' ? { frame_filter: this.frameFilter } : {}),
            ...(typeof this.dataChunkSize !== 'undefined' ? { chunk_size: this.dataChunkSize } : {}),
            ...(typeof this.copyData !== 'undefined' ? { copy_data: this.copyData } : {}),
            ...(typeof this.cloudStorageId !== 'undefined' ? { cloud_storage_id: this.cloudStorageId } : {}),
        };

        const task = await serverProxy.tasks.create(taskSpec, taskDataSpec, onUpdate);
        const labels = await serverProxy.labels.get({ task_id: task.id });
        const jobs = await serverProxy.jobs.get({
            filter: JSON.stringify({ and: [{ '==': [{ var: 'task_id' }, task.id] }] }),
        }, true);

        return new Task({
            ...omit(task, ['jobs', 'labels']),
            jobs,
            progress: task.jobs,
            labels: labels.results,
        });
    };

    Task.prototype.listenToCreate.implementation = async function (
        onUpdate: (state: RQStatus, progress: number, message: string) => void = () => {},
    ): Promise<TaskClass> {
        if (Number.isInteger(this.id) && this.size === 0) {
            const serializedTask = await serverProxy.tasks.listenToCreate(this.id, onUpdate);
            return new Task(omit(serializedTask, ['labels', 'jobs']));
        }

        return this;
    };

    Task.prototype.delete.implementation = async function () {
        const result = await serverProxy.tasks.delete(this.id);
        return result;
    };

    Task.prototype.issues.implementation = async function () {
        const result = await serverProxy.issues.get({ task_id: this.id });
        return result.map((issue) => new Issue(issue));
    };

    Task.prototype.backup.implementation = async function (
        targetStorage: Storage,
        useDefaultSettings: boolean,
        fileName?: string,
    ) {
        const result = await serverProxy.tasks.backup(this.id, targetStorage, useDefaultSettings, fileName);
        return result;
    };

    Task.restore.implementation = async function (storage: Storage, file: File | string) {
        // eslint-disable-next-line no-unsanitized/method
        const result = await serverProxy.tasks.restore(storage, file);
        return result;
    };

    Task.prototype.frames.get.implementation = async function (frame, isPlaying, step) {
        if (!Number.isInteger(frame) || frame < 0) {
            throw new ArgumentError(`Frame must be a positive integer. Got: "${frame}"`);
        }

        if (frame >= this.size) {
            throw new ArgumentError(`The frame with number ${frame} is out of the task`);
        }

        const job = this.jobs.filter((_job) => _job.startFrame <= frame && _job.stopFrame >= frame)[0];

        const result = await getFrame(
            job.id,
            this.dataChunkSize,
            this.dataChunkType,
            this.mode,
            frame,
            job.startFrame,
            job.stopFrame,
            isPlaying,
            step,
            this.dimension,
            (chunkNumber, quality) => job.frames.chunk(chunkNumber, quality),
        );
        return result;
    };

    Task.prototype.frames.cachedChunks.implementation = async function () {
        let chunks = [];
        for (const job of this.jobs) {
            const cachedChunks = await getCachedChunks(job.id);
            chunks = chunks.concat(cachedChunks);
        }
        return Array.from(new Set(chunks));
    };

    Task.prototype.frames.preview.implementation = async function (this: TaskClass): Promise<string> {
        if (this.id === null) return '';
        const preview = await serverProxy.tasks.getPreview(this.id);
        if (!preview) return '';
        return decodePreview(preview);
    };

    Task.prototype.frames.delete.implementation = async function (frame) {
        if (!Number.isInteger(frame)) {
            throw new Error(`Frame must be an integer. Got: "${frame}"`);
        }

        if (frame < 0 || frame >= this.size) {
            throw new Error('The frame is out of the task');
        }

        const job = this.jobs.filter((_job) => _job.startFrame <= frame && _job.stopFrame >= frame)[0];
        if (job) {
            await deleteFrameWrapper.call(this, job.id, frame);
        }
    };

    Task.prototype.frames.restore.implementation = async function (frame) {
        if (!Number.isInteger(frame)) {
            throw new Error(`Frame must be an integer. Got: "${frame}"`);
        }

        if (frame < 0 || frame >= this.size) {
            throw new Error('The frame is out of the task');
        }

        const job = this.jobs.filter((_job) => _job.startFrame <= frame && _job.stopFrame >= frame)[0];
        if (job) {
            await restoreFrameWrapper.call(this, job.id, frame);
        }
    };

    Task.prototype.frames.save.implementation = async function () {
        return Promise.all(this.jobs.map((job) => patchMeta(job.id)));
    };

    Task.prototype.frames.search.implementation = async function (filters, frameFrom, frameTo) {
        if (typeof filters !== 'object') {
            throw new ArgumentError('Filters should be an object');
        }

        if (!Number.isInteger(frameFrom) || !Number.isInteger(frameTo)) {
            throw new ArgumentError('The start and end frames both must be an integer');
        }

        if (frameFrom < 0 || frameFrom > this.size) {
            throw new ArgumentError('The start frame is out of the task');
        }

        if (frameTo < 0 || frameTo > this.size) {
            throw new ArgumentError('The stop frame is out of the task');
        }

        const jobs = this.jobs.filter((_job) => (
            (frameFrom >= _job.startFrame && frameFrom <= _job.stopFrame) ||
            (frameTo >= _job.startFrame && frameTo <= _job.stopFrame) ||
            (frameFrom < _job.startFrame && frameTo > _job.stopFrame)
        ));

        for (const job of jobs) {
            const result = await findFrame(
                job.id, Math.max(frameFrom, job.startFrame), Math.min(frameTo, job.stopFrame), filters,
            );

            if (result !== null) return result;
        }

        return null;
    };

    Task.prototype.frames.contextImage.implementation = async function () {
        throw new Error('Not implemented');
    };

    Task.prototype.frames.chunk.implementation = async function () {
        throw new Error('Not implemented');
    };

    // TODO: Check filter for annotations
    Task.prototype.annotations.get.implementation = async function (frame, allTracks, filters) {
        if (!Array.isArray(filters) || filters.some((filter) => typeof filter !== 'string')) {
            throw new ArgumentError('The filters argument must be an array of strings');
        }

        if (!Number.isInteger(frame) || frame < 0) {
            throw new ArgumentError(`Frame must be a positive integer. Got: "${frame}"`);
        }

        if (frame >= this.size) {
            throw new ArgumentError(`Frame ${frame} does not exist in the task`);
        }

        const result = await getAnnotations(this, frame, allTracks, filters);
        const deletedFrames = await getDeletedFrames('task', this.id);
        if (frame in deletedFrames) {
            return [];
        }

        return result;
    };

    Task.prototype.annotations.search.implementation = function (frameFrom, frameTo, searchParameters) {
        if ('annotationsFilters' in searchParameters && !Array.isArray(searchParameters.annotationsFilters)) {
            throw new ArgumentError('Annotations filters must be an array');
        }

        if ('generalFilters' in searchParameters && typeof searchParameters.generalFilters.isEmptyFrame !== 'boolean') {
            throw new ArgumentError('General filter isEmptyFrame must be a boolean');
        }

        if ('annotationsFilters' in searchParameters && 'generalFilters' in searchParameters) {
            throw new ArgumentError('Both annotations filters and general fiters could not be used together');
        }

        if (!Number.isInteger(frameFrom) || !Number.isInteger(frameTo)) {
            throw new ArgumentError('The start and end frames both must be an integer');
        }

        if (frameFrom < 0 || frameFrom >= this.size) {
            throw new ArgumentError('The start frame is out of the task');
        }

        if (frameTo < 0 || frameTo >= this.size) {
            throw new ArgumentError('The stop frame is out of the task');
        }

        return getCollection(this).search(frameFrom, frameTo, searchParameters);
    };

    Task.prototype.annotations.save.implementation = async function (onUpdate) {
        return getSaver(this).save(onUpdate);
    };

    Task.prototype.annotations.merge.implementation = async function (objectStates) {
        return getCollection(this).merge(objectStates);
    };

    Task.prototype.annotations.split.implementation = async function (objectState, frame) {
        return getCollection(this).split(objectState, frame);
    };

    Task.prototype.annotations.group.implementation = async function (objectStates, reset) {
        return getCollection(this).group(objectStates, reset);
    };

    Task.prototype.annotations.join.implementation = async function (objectStates, points) {
        return getCollection(this).join(objectStates, points);
    };

    Task.prototype.annotations.slice.implementation = async function (objectState, results) {
        return getCollection(this).slice(objectState, results);
    };

    Task.prototype.annotations.hasUnsavedChanges.implementation = function () {
        return getSaver(this).hasUnsavedChanges();
    };

    Object.defineProperty(Task.prototype.annotations.clear, 'implementation', {
        value: async function clearAnnotationsImplementation(
            this: TaskClass,
            flags: Parameters<typeof TaskClass.prototype.annotations.clear>[0],
        ): ReturnType<typeof Task.prototype.annotations.clear> {
            return clearAnnotations(this, flags);
        },
    });

    Task.prototype.annotations.select.implementation = function (objectStates, x, y) {
        return getCollection(this).select(objectStates, x, y);
    };

    Task.prototype.annotations.statistics.implementation = function () {
        return getCollection(this).statistics();
    };

    Task.prototype.annotations.put.implementation = function (objectStates) {
        return getCollection(this).put(objectStates);
    };

    Task.prototype.annotations.upload.implementation = async function (
        format: string,
        useDefaultLocation: boolean,
        sourceStorage: Storage,
        file: File | string,
        options?: { convMaskToPoly?: boolean },
    ) {
        const result = await importDataset(this, format, useDefaultLocation, sourceStorage, file, options);
        return result;
    };

    Task.prototype.annotations.import.implementation = function (data) {
        return getCollection(this).import(data);
    };

    Task.prototype.annotations.export.implementation = function () {
        return getCollection(this).export();
    };

    Task.prototype.annotations.exportDataset.implementation = async function (
        format: string,
        saveImages: boolean,
        useDefaultSettings: boolean,
        targetStorage: Storage,
        customName?: string,
    ) {
        const result = await exportDataset(this, format, saveImages, useDefaultSettings, targetStorage, customName);
        return result;
    };

    Task.prototype.actions.undo.implementation = async function (count) {
        return getHistory(this).undo(count);
    };

    Task.prototype.actions.redo.implementation = async function (count) {
        return getHistory(this).redo(count);
    };

    Task.prototype.actions.freeze.implementation = function (frozen) {
        return getHistory(this).freeze(frozen);
    };

    Task.prototype.actions.clear.implementation = function () {
        return getHistory(this).clear();
    };

    Task.prototype.actions.get.implementation = function () {
        return getHistory(this).get();
    };

    Task.prototype.logger.log.implementation = async function (scope, payload, wait) {
        const result = await logger.log(
            scope,
            {
                ...payload,
                project_id: this.projectId,
                task_id: this.id,
            },
            wait,
        );
        return result;
    };

    Task.prototype.guide.implementation = async function guide() {
        if (this.guideId === null) {
            return null;
        }

        const result = await serverProxy.guides.get(this.guideId);
        return new AnnotationGuide(result);
    };

    return Task;
}
