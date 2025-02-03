// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { omit } from 'lodash';
import config from './config';
import { ArgumentError } from './exceptions';
import {
    HistoryActions, JobStage, JobState, JobType,
    RQStatus,
} from './enums';
import { Task as TaskClass, Job as JobClass } from './session';
import logger from './logger';
import serverProxy from './server-proxy';
import {
    getFrame,
    deleteFrame,
    restoreFrame,
    getCachedChunks,
    getJobFrameNumbers,
    clear as clearFrames,
    findFrame,
    getContextImage,
    patchMeta,
    decodePreview,
} from './frames';
import Issue from './issue';
import {
    SerializedLabel, SerializedTask, SerializedJobValidationLayout,
    SerializedTaskValidationLayout,
} from './server-response-types';
import { checkInEnum, checkObjectType } from './common';
import {
    getCollection, getSaver, clearAnnotations, getAnnotations,
    importDataset, exportDataset, clearCache, getHistory,
} from './annotations';
import AnnotationGuide from './guide';
import requestsManager from './requests-manager';
import { Request } from './request';
import User from './user';
import { JobValidationLayout, TaskValidationLayout } from './validation-layout';

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
            fields: Parameters<typeof JobClass.prototype.save>[0],
        ): ReturnType<typeof JobClass.prototype.save> {
            if (this.id) {
                const jobData = {
                    ...('assignee' in fields ? { assignee: fields.assignee } : {}),
                    ...('stage' in fields ? { stage: fields.stage } : {}),
                    ...('state' in fields ? { state: fields.state } : {}),
                };

                if (jobData.assignee) {
                    checkObjectType('job assignee', jobData.assignee, null, User);
                    jobData.assignee = jobData.assignee.id;
                }

                if (jobData.state) {
                    checkInEnum<JobState>('job state', jobData.state, Object.values(JobState));
                }

                if (jobData.stage) {
                    checkInEnum<JobStage>('job stage', jobData.stage, Object.values(JobStage));
                }

                const data = await serverProxy.jobs.save(this.id, jobData);
                this.reinit({ ...data, labels: [] });
                return this;
            }

            const jobSpec = {
                ...(this.assignee ? { assignee: this.assignee.id } : {}),
                ...(this.stage ? { stage: this.stage } : {}),
                ...(this.state ? { stage: this.state } : {}),
                type: this.type,
                task_id: this.taskId,
            };

            const job = await serverProxy.jobs.create({ ...jobSpec, ...fields });
            return new JobClass({ ...job, labels: [] });
        },
    });

    Object.defineProperty(Job.prototype.delete, 'implementation', {
        value: async function deleteImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.delete> {
            if (this.type !== JobType.GROUND_TRUTH) {
                throw new Error('Only ground truth job can be deleted');
            }

            return serverProxy.jobs.delete(this.id);
        },
    });

    Object.defineProperty(Job.prototype.issues, 'implementation', {
        value: function issuesImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.issues> {
            return serverProxy.issues.get({ job_id: this.id })
                .then((issues) => issues.map((issue) => new Issue(issue)));
        },
    });

    Object.defineProperty(Job.prototype.openIssue, 'implementation', {
        value: async function openIssueImplementation(
            this: JobClass,
            issue: Parameters<typeof JobClass.prototype.openIssue>[0],
            message: Parameters<typeof JobClass.prototype.openIssue>[1],
        ): ReturnType<typeof JobClass.prototype.openIssue> {
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
        ): ReturnType<typeof JobClass.prototype.guide> {
            if (this.guideId === null) {
                return null;
            }

            const result = await serverProxy.guides.get(this.guideId);
            return new AnnotationGuide(result);
        },
    });

    Object.defineProperty(Job.prototype.validationLayout, 'implementation', {
        value: async function validationLayoutImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.validationLayout> {
            const result = await serverProxy.jobs.validationLayout(this.id);
            if (Object.keys(result).length) {
                return new JobValidationLayout(result as SerializedJobValidationLayout);
            }

            return null;
        },
    });

    Object.defineProperty(Job.prototype.frames.get, 'implementation', {
        value: function getFrameImplementation(
            this: JobClass,
            frame: Parameters<typeof JobClass.prototype.frames.get>[0],
            isPlaying: Parameters<typeof JobClass.prototype.frames.get>[1],
            step: Parameters<typeof JobClass.prototype.frames.get>[2],
        ): ReturnType<typeof JobClass.prototype.frames.get> {
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
                isPlaying,
                step,
                this.dimension,
                (chunkIndex, quality) => this.frames.chunk(chunkIndex, quality),
            );
        },
    });

    Object.defineProperty(Job.prototype.frames.delete, 'implementation', {
        value: function deleteFrameImplementation(
            this: JobClass,
            frame: Parameters<typeof JobClass.prototype.frames.delete>[0],
        ): ReturnType<typeof JobClass.prototype.frames.delete> {
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
        value: function restoreFrameImplementation(
            this: JobClass,
            frame: Parameters<typeof JobClass.prototype.frames.restore>[0],
        ): ReturnType<typeof JobClass.prototype.frames.restore> {
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
        ): ReturnType<typeof JobClass.prototype.frames.save> {
            return patchMeta(this.id).then((meta) => [meta]);
        },
    });

    Object.defineProperty(Job.prototype.frames.cachedChunks, 'implementation', {
        value: function cachedChunksImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.frames.cachedChunks> {
            return Promise.resolve(getCachedChunks(this.id));
        },
    });

    Object.defineProperty(Job.prototype.frames.frameNumbers, 'implementation', {
        value: function includedFramesImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.frames.frameNumbers> {
            return getJobFrameNumbers(this.id);
        },
    });

    Object.defineProperty(Job.prototype.frames.preview, 'implementation', {
        value: function previewImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.frames.preview> {
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
            frameId: Parameters<typeof JobClass.prototype.frames.contextImage>[0],
        ): ReturnType<typeof JobClass.prototype.frames.contextImage> {
            return getContextImage(this.id, frameId);
        },
    });

    Object.defineProperty(Job.prototype.frames.chunk, 'implementation', {
        value: function chunkImplementation(
            this: JobClass,
            chunkIndex: Parameters<typeof JobClass.prototype.frames.chunk>[0],
            quality: Parameters<typeof JobClass.prototype.frames.chunk>[1],
        ): ReturnType<typeof JobClass.prototype.frames.chunk> {
            return serverProxy.frames.getData(this.id, chunkIndex, quality);
        },
    });

    Object.defineProperty(Job.prototype.frames.search, 'implementation', {
        value: function searchFrameImplementation(
            this: JobClass,
            filters: Parameters<typeof JobClass.prototype.frames.search>[0],
            frameFrom: Parameters<typeof JobClass.prototype.frames.search>[1],
            frameTo: Parameters<typeof JobClass.prototype.frames.search>[2],
        ): ReturnType<typeof JobClass.prototype.frames.search> {
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
            frame: Parameters<typeof JobClass.prototype.annotations.get>[0],
            allTracks: Parameters<typeof JobClass.prototype.annotations.get>[1],
            filters: Parameters<typeof JobClass.prototype.annotations.get>[2],
        ): ReturnType<typeof JobClass.prototype.annotations.get> {
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
            return annotationsData;
        },
    });

    Object.defineProperty(Job.prototype.annotations.search, 'implementation', {
        value: function searchAnnotationsImplementation(
            this: JobClass,
            frameFrom: Parameters<typeof JobClass.prototype.annotations.search>[0],
            frameTo: Parameters<typeof JobClass.prototype.annotations.search>[1],
            searchParameters: Parameters<typeof JobClass.prototype.annotations.search>[2],
        ): ReturnType<typeof JobClass.prototype.annotations.search> {
            if ('annotationsFilters' in searchParameters && !Array.isArray(searchParameters.annotationsFilters)) {
                throw new ArgumentError('Annotations filters must be an array');
            }

            if ('generalFilters' in searchParameters && typeof searchParameters.generalFilters.isEmptyFrame !== 'boolean') {
                throw new ArgumentError('General filter isEmptyFrame must be a boolean');
            }

            if ('annotationsFilters' in searchParameters && 'generalFilters' in searchParameters) {
                throw new ArgumentError('Both annotations filters and general filters could not be used together');
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
            onUpdate: Parameters<typeof JobClass.prototype.annotations.save>[0],
        ): ReturnType<typeof JobClass.prototype.annotations.save> {
            return getSaver(this).save(onUpdate);
        },
    });

    Object.defineProperty(Job.prototype.annotations.merge, 'implementation', {
        value: function mergeAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof JobClass.prototype.annotations.merge>[0],
        ): ReturnType<typeof JobClass.prototype.annotations.merge> {
            return Promise.resolve(getCollection(this).merge(objectStates));
        },
    });

    Object.defineProperty(Job.prototype.annotations.split, 'implementation', {
        value: function splitAnnotationsImplementation(
            this: JobClass,
            objectState: Parameters<typeof JobClass.prototype.annotations.split>[0],
            frame: Parameters<typeof JobClass.prototype.annotations.split>[1],
        ): ReturnType<typeof JobClass.prototype.annotations.split> {
            return Promise.resolve(getCollection(this).split(objectState, frame));
        },
    });

    Object.defineProperty(Job.prototype.annotations.group, 'implementation', {
        value: function groupAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof JobClass.prototype.annotations.group>[0],
            reset: Parameters<typeof JobClass.prototype.annotations.group>[1],
        ): ReturnType<typeof JobClass.prototype.annotations.group> {
            return Promise.resolve(getCollection(this).group(objectStates, reset));
        },
    });

    Object.defineProperty(Job.prototype.annotations.join, 'implementation', {
        value: function joinAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof JobClass.prototype.annotations.join>[0],
            points: Parameters<typeof JobClass.prototype.annotations.join>[1],
        ): ReturnType<typeof JobClass.prototype.annotations.join> {
            return Promise.resolve(getCollection(this).join(objectStates, points));
        },
    });

    Object.defineProperty(Job.prototype.annotations.slice, 'implementation', {
        value: function sliceAnnotationsImplementation(
            this: JobClass,
            objectState: Parameters<typeof JobClass.prototype.annotations.slice>[0],
            results: Parameters<typeof JobClass.prototype.annotations.slice>[1],
        ): ReturnType<typeof JobClass.prototype.annotations.slice> {
            return Promise.resolve(getCollection(this).slice(objectState, results));
        },
    });

    Object.defineProperty(Job.prototype.annotations.hasUnsavedChanges, 'implementation', {
        value: function hasUnsavedChangesImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.annotations.hasUnsavedChanges> {
            return getSaver(this).hasUnsavedChanges();
        },
    });

    Object.defineProperty(Job.prototype.annotations.clear, 'implementation', {
        value: function clearAnnotationsImplementation(
            this: JobClass,
            options: Parameters<typeof JobClass.prototype.annotations.clear>[0],
        ): ReturnType<typeof JobClass.prototype.annotations.clear> {
            return clearAnnotations(this, options);
        },
    });

    Object.defineProperty(Job.prototype.annotations.select, 'implementation', {
        value: function selectAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof JobClass.prototype.annotations.select>[0],
            x: Parameters<typeof JobClass.prototype.annotations.select>[1],
            y: Parameters<typeof JobClass.prototype.annotations.select>[2],
        ): ReturnType<typeof JobClass.prototype.annotations.select> {
            return Promise.resolve(getCollection(this).select(objectStates, x, y));
        },
    });

    Object.defineProperty(Job.prototype.annotations.statistics, 'implementation', {
        value: function statisticsImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.annotations.statistics> {
            return Promise.resolve(getCollection(this).statistics());
        },
    });

    Object.defineProperty(Job.prototype.annotations.put, 'implementation', {
        value: function putAnnotationsImplementation(
            this: JobClass,
            objectStates: Parameters<typeof JobClass.prototype.annotations.put>[0],
        ): ReturnType<typeof JobClass.prototype.annotations.put> {
            return Promise.resolve(getCollection(this).put(objectStates));
        },
    });

    Object.defineProperty(Job.prototype.annotations.import, 'implementation', {
        value: function importAnnotationsImplementation(
            this: JobClass,
            data: Parameters<typeof JobClass.prototype.annotations.import>[0],
        ): ReturnType<typeof JobClass.prototype.annotations.import> {
            getCollection(this).import(data);
            return Promise.resolve();
        },
    });

    Object.defineProperty(Job.prototype.annotations.export, 'implementation', {
        value: function exportAnnotationsImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.annotations.export> {
            return Promise.resolve(getCollection(this).export());
        },
    });

    Object.defineProperty(Job.prototype.annotations.commit, 'implementation', {
        value: function commitAnnotationsImplementation(
            this: JobClass,
            added: Parameters<typeof JobClass.prototype.annotations.commit>[0],
            removed: Parameters<typeof JobClass.prototype.annotations.commit>[1],
            frame: Parameters<typeof JobClass.prototype.annotations.commit>[2],
        ): ReturnType<typeof JobClass.prototype.annotations.commit> {
            getCollection(this).commit(added, removed, frame);
            return Promise.resolve();
        },
    });

    Object.defineProperty(Job.prototype.annotations.upload, 'implementation', {
        value: async function uploadAnnotationsImplementation(
            this: JobClass,
            format: Parameters<typeof JobClass.prototype.annotations.upload>[0],
            useDefaultLocation: Parameters<typeof JobClass.prototype.annotations.upload>[1],
            sourceStorage: Parameters<typeof JobClass.prototype.annotations.upload>[2],
            file: Parameters<typeof JobClass.prototype.annotations.upload>[3],
            options: Parameters<typeof JobClass.prototype.annotations.upload>[4],
        ): ReturnType<typeof JobClass.prototype.annotations.upload> {
            const rqID = await importDataset(this, format, useDefaultLocation, sourceStorage, file, options);
            return rqID;
        },
    });

    Object.defineProperty(Job.prototype.annotations.exportDataset, 'implementation', {
        value: async function exportDatasetImplementation(
            this: JobClass,
            format: Parameters<typeof JobClass.prototype.annotations.exportDataset>[0],
            saveImages: Parameters<typeof JobClass.prototype.annotations.exportDataset>[1],
            useDefaultSettings: Parameters<typeof JobClass.prototype.annotations.exportDataset>[2],
            targetStorage: Parameters<typeof JobClass.prototype.annotations.exportDataset>[3],
            customName?: Parameters<typeof JobClass.prototype.annotations.exportDataset>[4],
        ): ReturnType<typeof JobClass.prototype.annotations.exportDataset> {
            const rqID = await exportDataset(this, format, saveImages, useDefaultSettings, targetStorage, customName);
            return rqID;
        },
    });

    Object.defineProperty(Job.prototype.actions.undo, 'implementation', {
        value: async function undoActionImplementation(
            this: JobClass,
            count: Parameters<typeof JobClass.prototype.actions.undo>[0],
        ): ReturnType<typeof JobClass.prototype.actions.undo> {
            return getHistory(this).undo(count);
        },
    });

    Object.defineProperty(Job.prototype.actions.redo, 'implementation', {
        value: async function redoActionImplementation(
            this: JobClass,
            count: Parameters<typeof JobClass.prototype.actions.redo>[0],
        ): ReturnType<typeof JobClass.prototype.actions.redo> {
            return getHistory(this).redo(count);
        },
    });

    Object.defineProperty(Job.prototype.actions.freeze, 'implementation', {
        value: function freezeActionsImplementation(
            this: JobClass,
            frozen: Parameters<typeof JobClass.prototype.actions.freeze>[0],
        ): ReturnType<typeof JobClass.prototype.actions.freeze> {
            return Promise.resolve(getHistory(this).freeze(frozen));
        },
    });

    Object.defineProperty(Job.prototype.actions.clear, 'implementation', {
        value: function clearActionsImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.actions.clear> {
            return Promise.resolve(getHistory(this).clear());
        },
    });

    Object.defineProperty(Job.prototype.actions.get, 'implementation', {
        value: function getActionsImplementation(
            this: JobClass,
        ): ReturnType<typeof JobClass.prototype.actions.get> {
            return Promise.resolve(getHistory(this).get());
        },
    });

    Object.defineProperty(Job.prototype.logger.log, 'implementation', {
        value: async function logImplementation(
            this: JobClass,
            scope: Parameters<typeof JobClass.prototype.logger.log>[0],
            payload: Parameters<typeof JobClass.prototype.logger.log>[1],
            wait: Parameters<typeof JobClass.prototype.logger.log>[2],
        ): ReturnType<typeof JobClass.prototype.logger.log> {
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

export function implementTask(Task: typeof TaskClass): typeof TaskClass {
    Object.defineProperty(Task.prototype.close, 'implementation', {
        value: function closeImplementation(
            this: TaskClass,
        ) {
            for (const job of this.jobs) {
                clearFrames(job.id);
                clearCache(job);
            }

            clearCache(this);
        },
    });

    Object.defineProperty(Task.prototype.guide, 'implementation', {
        value: async function guideImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.guide> {
            if (this.guideId === null) {
                return null;
            }

            const result = await serverProxy.guides.get(this.guideId);
            return new AnnotationGuide(result);
        },
    });

    Object.defineProperty(Task.prototype.validationLayout, 'implementation', {
        value: async function validationLayoutImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.validationLayout> {
            const result = await serverProxy.tasks.validationLayout(this.id) as SerializedTaskValidationLayout;
            if (result.mode !== null) {
                return new TaskValidationLayout(result);
            }

            return null;
        },
    });

    Object.defineProperty(Task.prototype.save, 'implementation', {
        value: async function saveImplementation(
            this: TaskClass,
            fields: Parameters<typeof TaskClass.prototype.save>[0],
            options: Parameters<typeof TaskClass.prototype.save>[1],
        ): ReturnType<typeof TaskClass.prototype.save> {
            if (typeof this.id !== 'undefined') {
                // If the task has been already created, we update it
                const taskData = {
                    ...this._updateTrigger.getUpdated(this, {
                        bugTracker: 'bug_tracker',
                        projectId: 'project_id',
                        assignee: 'assignee_id',
                    }),
                };

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

            if (fields.consensus_replicas) {
                taskSpec.consensus_replicas = fields.consensus_replicas;
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
                ...(fields.validation_params ? { validation_params: fields.validation_params } : {}),
            };

            const { taskID, rqID } = await serverProxy.tasks.create(
                taskSpec,
                taskDataSpec,
                options?.updateStatusCallback || (() => {}),
            );

            await requestsManager.listen(rqID, {
                callback: (request: Request) => {
                    options?.updateStatusCallback(request);
                    if (request.status === RQStatus.FAILED) {
                        serverProxy.tasks.delete(taskID, config.organization.organizationSlug || null);
                    }
                },
            });

            const [task] = await serverProxy.tasks.get({ id: taskID });
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
        },
    });

    Object.defineProperty(Task.prototype.listenToCreate, 'implementation', {
        value: async function listenToCreateImplementation(
            this: TaskClass,
            rqID: Parameters<typeof TaskClass.prototype.listenToCreate>[0],
            options: Parameters<typeof TaskClass.prototype.listenToCreate>[1],
        ): ReturnType<typeof TaskClass.prototype.listenToCreate> {
            if (Number.isInteger(this.id) && this.size === 0) {
                const request = await requestsManager.listen(rqID, options);
                const [serializedTask] = await serverProxy.tasks.get({ id: request.operation.taskID });
                return new Task(omit(serializedTask, ['labels', 'jobs']));
            }

            return this;
        },
    });

    Object.defineProperty(Task.prototype.delete, 'implementation', {
        value: function deleteImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.delete> {
            return serverProxy.tasks.delete(this.id);
        },
    });

    Object.defineProperty(Task.prototype.issues, 'implementation', {
        value: function issuesImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.issues> {
            return serverProxy.issues.get({ task_id: this.id })
                .then((issues) => issues.map((issue) => new Issue(issue)));
        },
    });

    Object.defineProperty(Task.prototype.backup, 'implementation', {
        value: async function backupImplementation(
            this: TaskClass,
            targetStorage: Parameters<typeof TaskClass.prototype.backup>[0],
            useDefaultSettings: Parameters<typeof TaskClass.prototype.backup>[1],
            fileName: Parameters<typeof TaskClass.prototype.backup>[2],
        ): ReturnType<typeof TaskClass.prototype.backup> {
            const rqID = await serverProxy.tasks.backup(this.id, targetStorage, useDefaultSettings, fileName);
            return rqID;
        },
    });

    Object.defineProperty(Task.restore, 'implementation', {
        value: async function restoreImplementation(
            this: TaskClass,
            storage: Parameters<typeof TaskClass.restore>[0],
            file: Parameters<typeof TaskClass.restore>[1],
        ): ReturnType<typeof TaskClass.restore> {
            const rqID = await serverProxy.tasks.restore(storage, file);
            return rqID;
        },
    });

    Object.defineProperty(Task.prototype.frames.get, 'implementation', {
        value: async function getFrameImplementation(
            this: TaskClass,
            frame: Parameters<typeof TaskClass.prototype.frames.get>[0],
            isPlaying: Parameters<typeof TaskClass.prototype.frames.get>[1],
            step: Parameters<typeof TaskClass.prototype.frames.get>[2],
        ): ReturnType<typeof TaskClass.prototype.frames.get> {
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
                isPlaying,
                step,
                this.dimension,
                (chunkIndex, quality) => job.frames.chunk(chunkIndex, quality),
            );
            return result;
        },
    });

    Object.defineProperty(Task.prototype.frames.cachedChunks, 'implementation', {
        value: async function cachedChunksImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.frames.cachedChunks> {
            throw new Error('Not implemented for Task');
        },
    });

    Object.defineProperty(Task.prototype.frames.frameNumbers, 'implementation', {
        value: function includedFramesImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.frames.frameNumbers> {
            throw new Error('Not implemented for Task');
        },
    });

    Object.defineProperty(Task.prototype.frames.preview, 'implementation', {
        value: function previewImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.frames.preview> {
            if (this.id === null) {
                return Promise.resolve('');
            }

            return serverProxy.tasks.getPreview(this.id).then((preview) => {
                if (!preview) {
                    return Promise.resolve('');
                }
                return decodePreview(preview);
            });
        },
    });

    Object.defineProperty(Task.prototype.frames.delete, 'implementation', {
        value: async function deleteFrameImplementation(
            this: TaskClass,
            frame: Parameters<typeof TaskClass.prototype.frames.delete>[0],
        ): ReturnType<typeof TaskClass.prototype.frames.delete> {
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
        },
    });

    Object.defineProperty(Task.prototype.frames.restore, 'implementation', {
        value: async function restoreFrameImplementation(
            this: TaskClass,
            frame: Parameters<typeof TaskClass.prototype.frames.restore>[0],
        ): ReturnType<typeof TaskClass.prototype.frames.restore> {
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
        },
    });

    Object.defineProperty(Task.prototype.frames.save, 'implementation', {
        value: async function saveFramesImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.frames.save> {
            return Promise.all(this.jobs.map((job) => patchMeta(job.id)));
        },
    });

    Object.defineProperty(Task.prototype.frames.search, 'implementation', {
        value: async function searchFrameImplementation(
            this: TaskClass,
            filters: Parameters<typeof TaskClass.prototype.frames.search>[0],
            frameFrom: Parameters<typeof TaskClass.prototype.frames.search>[1],
            frameTo: Parameters<typeof TaskClass.prototype.frames.search>[2],
        ): ReturnType<typeof TaskClass.prototype.frames.search> {
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
        },
    });

    Object.defineProperty(Task.prototype.frames.contextImage, 'implementation', {
        value: function contextImageImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.frames.contextImage> {
            throw new Error('Not implemented for Task');
        },
    });

    Object.defineProperty(Task.prototype.frames.chunk, 'implementation', {
        value: function chunkImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.frames.chunk> {
            throw new Error('Not implemented for Task');
        },
    });

    Object.defineProperty(Task.prototype.annotations.get, 'implementation', {
        value: async function getAnnotationsImplementation(
            this: TaskClass,
            frame: Parameters<typeof TaskClass.prototype.annotations.get>[0],
            allTracks: Parameters<typeof TaskClass.prototype.annotations.get>[1],
            filters: Parameters<typeof TaskClass.prototype.annotations.get>[2],
        ): ReturnType<typeof TaskClass.prototype.annotations.get> {
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
            return result;
        },
    });

    Object.defineProperty(Task.prototype.annotations.search, 'implementation', {
        value: function searchAnnotationsImplementation(
            this: TaskClass,
            frameFrom: Parameters<typeof TaskClass.prototype.annotations.search>[0],
            frameTo: Parameters<typeof TaskClass.prototype.annotations.search>[1],
            searchParameters: Parameters<typeof TaskClass.prototype.annotations.search>[2],
        ): ReturnType<typeof TaskClass.prototype.annotations.search> {
            if ('annotationsFilters' in searchParameters && !Array.isArray(searchParameters.annotationsFilters)) {
                throw new ArgumentError('Annotations filters must be an array');
            }

            if ('generalFilters' in searchParameters && typeof searchParameters.generalFilters.isEmptyFrame !== 'boolean') {
                throw new ArgumentError('General filter isEmptyFrame must be a boolean');
            }

            if ('annotationsFilters' in searchParameters && 'generalFilters' in searchParameters) {
                throw new ArgumentError('Both annotations filters and general filters could not be used together');
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

            return Promise.resolve(getCollection(this).search(frameFrom, frameTo, searchParameters));
        },
    });

    Object.defineProperty(Task.prototype.annotations.save, 'implementation', {
        value: function saveAnnotationsImplementation(
            this: TaskClass,
            onUpdate: Parameters<typeof TaskClass.prototype.annotations.save>[0],
        ): ReturnType<typeof TaskClass.prototype.annotations.save> {
            return getSaver(this).save(onUpdate);
        },
    });

    Object.defineProperty(Task.prototype.annotations.merge, 'implementation', {
        value: function mergeAnnotationsImplementation(
            this: TaskClass,
            objectStates: Parameters<typeof TaskClass.prototype.annotations.merge>[0],
        ): ReturnType<typeof TaskClass.prototype.annotations.merge> {
            return Promise.resolve(getCollection(this).merge(objectStates));
        },
    });

    Object.defineProperty(Task.prototype.annotations.split, 'implementation', {
        value: function splitAnnotationsImplementation(
            this: TaskClass,
            objectState: Parameters<typeof TaskClass.prototype.annotations.split>[0],
            frame: Parameters<typeof TaskClass.prototype.annotations.split>[1],
        ): ReturnType<typeof TaskClass.prototype.annotations.split> {
            return Promise.resolve(getCollection(this).split(objectState, frame));
        },
    });

    Object.defineProperty(Task.prototype.annotations.group, 'implementation', {
        value: function groupAnnotationsImplementation(
            this: TaskClass,
            objectStates: Parameters<typeof TaskClass.prototype.annotations.group>[0],
            reset: Parameters<typeof TaskClass.prototype.annotations.group>[1],
        ): ReturnType<typeof TaskClass.prototype.annotations.group> {
            return Promise.resolve(getCollection(this).group(objectStates, reset));
        },
    });

    Object.defineProperty(Task.prototype.annotations.join, 'implementation', {
        value: function joinAnnotationsImplementation(
            this: TaskClass,
            objectStates: Parameters<typeof TaskClass.prototype.annotations.join>[0],
            points: Parameters<typeof TaskClass.prototype.annotations.join>[1],
        ): ReturnType<typeof TaskClass.prototype.annotations.join> {
            return Promise.resolve(getCollection(this).join(objectStates, points));
        },
    });

    Object.defineProperty(Task.prototype.annotations.slice, 'implementation', {
        value: function sliceAnnotationsImplementation(
            this: TaskClass,
            objectState: Parameters<typeof TaskClass.prototype.annotations.slice>[0],
            results: Parameters<typeof TaskClass.prototype.annotations.slice>[1],
        ): ReturnType<typeof TaskClass.prototype.annotations.slice> {
            return Promise.resolve(getCollection(this).slice(objectState, results));
        },
    });

    Object.defineProperty(Task.prototype.annotations.hasUnsavedChanges, 'implementation', {
        value: function hasUnsavedChangesImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.annotations.hasUnsavedChanges> {
            return getSaver(this).hasUnsavedChanges();
        },
    });

    Object.defineProperty(Task.prototype.annotations.clear, 'implementation', {
        value: function clearAnnotationsImplementation(
            this: TaskClass,
            options: Parameters<typeof TaskClass.prototype.annotations.clear>[0],
        ): ReturnType<typeof Task.prototype.annotations.clear> {
            return clearAnnotations(this, options);
        },
    });

    Object.defineProperty(Task.prototype.annotations.select, 'implementation', {
        value: function selectAnnotationsImplementation(
            this: TaskClass,
            objectStates: Parameters<typeof TaskClass.prototype.annotations.select>[0],
            x: Parameters<typeof TaskClass.prototype.annotations.select>[1],
            y: Parameters<typeof TaskClass.prototype.annotations.select>[2],
        ): ReturnType<typeof TaskClass.prototype.annotations.select> {
            return Promise.resolve(getCollection(this).select(objectStates, x, y));
        },
    });

    Object.defineProperty(Task.prototype.annotations.statistics, 'implementation', {
        value: function statisticsImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.annotations.statistics> {
            return Promise.resolve(getCollection(this).statistics());
        },
    });

    Object.defineProperty(Task.prototype.annotations.put, 'implementation', {
        value: function putAnnotationsImplementation(
            this: TaskClass,
            objectStates: Parameters<typeof TaskClass.prototype.annotations.put>[0],
        ): ReturnType<typeof TaskClass.prototype.annotations.put> {
            return Promise.resolve(getCollection(this).put(objectStates));
        },
    });

    Object.defineProperty(Task.prototype.annotations.upload, 'implementation', {
        value: async function uploadAnnotationsImplementation(
            this: TaskClass,
            format: Parameters<typeof TaskClass.prototype.annotations.upload>[0],
            useDefaultLocation: Parameters<typeof TaskClass.prototype.annotations.upload>[1],
            sourceStorage: Parameters<typeof TaskClass.prototype.annotations.upload>[2],
            file: Parameters<typeof TaskClass.prototype.annotations.upload>[3],
            options: Parameters<typeof TaskClass.prototype.annotations.upload>[4],
        ): ReturnType<typeof TaskClass.prototype.annotations.upload> {
            const rqID = await importDataset(this, format, useDefaultLocation, sourceStorage, file, options);
            return rqID;
        },
    });

    Object.defineProperty(Task.prototype.annotations.import, 'implementation', {
        value: function importAnnotationsImplementation(
            this: TaskClass,
            data: Parameters<typeof TaskClass.prototype.annotations.import>[0],
        ): ReturnType<typeof TaskClass.prototype.annotations.import> {
            getCollection(this).import(data);
            return Promise.resolve();
        },
    });

    Object.defineProperty(Task.prototype.annotations.export, 'implementation', {
        value: function exportAnnotationsImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.annotations.export> {
            return Promise.resolve(getCollection(this).export());
        },
    });

    Object.defineProperty(Task.prototype.annotations.commit, 'implementation', {
        value: function commitAnnotationsImplementation(
            this: TaskClass,
            added: Parameters<typeof TaskClass.prototype.annotations.commit>[0],
            removed: Parameters<typeof TaskClass.prototype.annotations.commit>[1],
            frame: Parameters<typeof TaskClass.prototype.annotations.commit>[2],
        ): ReturnType<typeof TaskClass.prototype.annotations.commit> {
            getCollection(this).commit(added, removed, frame);
            return Promise.resolve();
        },
    });

    Object.defineProperty(Task.prototype.annotations.exportDataset, 'implementation', {
        value: async function exportDatasetImplementation(
            this: TaskClass,
            format: Parameters<typeof TaskClass.prototype.annotations.exportDataset>[0],
            saveImages: Parameters<typeof TaskClass.prototype.annotations.exportDataset>[1],
            useDefaultSettings: Parameters<typeof TaskClass.prototype.annotations.exportDataset>[2],
            targetStorage: Parameters<typeof TaskClass.prototype.annotations.exportDataset>[3],
            customName: Parameters<typeof TaskClass.prototype.annotations.exportDataset>[4],
        ): ReturnType<typeof TaskClass.prototype.annotations.exportDataset> {
            const rqID = await exportDataset(this, format, saveImages, useDefaultSettings, targetStorage, customName);
            return rqID;
        },
    });

    Object.defineProperty(Task.prototype.actions.undo, 'implementation', {
        value: function undoActionImplementation(
            this: TaskClass,
            count: Parameters<typeof TaskClass.prototype.actions.undo>[0],
        ): ReturnType<typeof TaskClass.prototype.actions.undo> {
            return getHistory(this).undo(count);
        },
    });

    Object.defineProperty(Task.prototype.actions.redo, 'implementation', {
        value: function redoActionImplementation(
            this: TaskClass,
            count: Parameters<typeof TaskClass.prototype.actions.redo>[0],
        ): ReturnType<typeof TaskClass.prototype.actions.redo> {
            return getHistory(this).redo(count);
        },
    });

    Object.defineProperty(Task.prototype.actions.freeze, 'implementation', {
        value: function freezeActionsImplementation(
            this: TaskClass,
            frozen: Parameters<typeof TaskClass.prototype.actions.freeze>[0],
        ): ReturnType<typeof TaskClass.prototype.actions.freeze> {
            return Promise.resolve(getHistory(this).freeze(frozen));
        },
    });

    Object.defineProperty(Task.prototype.actions.clear, 'implementation', {
        value: function clearActionsImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.actions.clear> {
            return Promise.resolve(getHistory(this).clear());
        },
    });

    Object.defineProperty(Task.prototype.actions.get, 'implementation', {
        value: function getActionsImplementation(
            this: TaskClass,
        ): ReturnType<typeof TaskClass.prototype.actions.get> {
            return Promise.resolve(getHistory(this).get());
        },
    });

    Object.defineProperty(Task.prototype.logger.log, 'implementation', {
        value: function logImplementation(
            this: TaskClass,
            scope: Parameters<typeof TaskClass.prototype.logger.log>[0],
            payload: Parameters<typeof TaskClass.prototype.logger.log>[1],
            wait: Parameters<typeof TaskClass.prototype.logger.log>[2],
        ): ReturnType<typeof TaskClass.prototype.logger.log> {
            return logger.log(
                scope,
                {
                    ...payload,
                    project_id: this.projectId,
                    task_id: this.id,
                },
                wait,
            );
        },
    });

    return Task;
}
