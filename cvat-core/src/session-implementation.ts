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

export function implementJob(Job) {
    Job.prototype.save.implementation = async function (additionalData: any) {
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
    };

    Job.prototype.delete.implementation = async function () {
        if (this.type !== JobType.GROUND_TRUTH) {
            throw new Error('Only ground truth job can be deleted');
        }
        const result = await serverProxy.jobs.delete(this.id);
        return result;
    };

    Job.prototype.issues.implementation = async function () {
        const result = await serverProxy.issues.get({ job_id: this.id });
        return result.map((issue) => new Issue(issue));
    };

    Job.prototype.openIssue.implementation = async function (issue, message) {
        checkObjectType('issue', issue, null, Issue);
        checkObjectType('message', message, 'string');
        const result = await serverProxy.issues.create({
            ...issue.serialize(),
            message,
        });
        return new Issue(result);
    };

    Job.prototype.frames.get.implementation = async function (frame, isPlaying, step) {
        if (!Number.isInteger(frame) || frame < 0) {
            throw new ArgumentError(`Frame must be a positive integer. Got: "${frame}"`);
        }

        if (frame < this.startFrame || frame > this.stopFrame) {
            throw new ArgumentError(`The frame with number ${frame} is out of the job`);
        }

        const frameData = await getFrame(
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
        return frameData;
    };

    Job.prototype.frames.delete.implementation = async function (frame) {
        if (!Number.isInteger(frame)) {
            throw new Error(`Frame must be an integer. Got: "${frame}"`);
        }

        if (frame < this.startFrame || frame > this.stopFrame) {
            throw new Error('The frame is out of the job');
        }

        await deleteFrameWrapper.call(this, this.id, frame);
    };

    Job.prototype.frames.restore.implementation = async function (frame) {
        if (!Number.isInteger(frame)) {
            throw new Error(`Frame must be an integer. Got: "${frame}"`);
        }

        if (frame < this.startFrame || frame > this.stopFrame) {
            throw new Error('The frame is out of the job');
        }

        await restoreFrameWrapper.call(this, this.id, frame);
    };

    Job.prototype.frames.save.implementation = async function () {
        const result = await patchMeta(this.id);
        return result;
    };

    Job.prototype.frames.cachedChunks.implementation = async function () {
        const cachedChunks = await getCachedChunks(this.id);
        return cachedChunks;
    };

    Job.prototype.frames.preview.implementation = async function (this: JobClass): Promise<string> {
        if (this.id === null || this.taskId === null) return '';
        const preview = await serverProxy.jobs.getPreview(this.id);
        if (!preview) return '';
        return decodePreview(preview);
    };

    Job.prototype.frames.contextImage.implementation = async function (frameId) {
        const result = await getContextImage(this.id, frameId);
        return result;
    };

    Job.prototype.frames.chunk.implementation = async function (chunkNumber, quality) {
        const result = await serverProxy.frames.getData(this.id, chunkNumber, quality);
        return result;
    };

    Job.prototype.frames.search.implementation = async function (filters, frameFrom, frameTo) {
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
    };

    Job.prototype.annotations.get.implementation = async function (frame, allTracks, filters) {
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
    };

    Job.prototype.annotations.search.implementation = function (frameFrom, frameTo, searchParameters) {
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

        return getCollection(this).search(frameFrom, frameTo, searchParameters);
    };

    Job.prototype.annotations.save.implementation = async function (onUpdate) {
        return getSaver(this).save(onUpdate);
    };

    Job.prototype.annotations.merge.implementation = async function (objectStates) {
        return getCollection(this).merge(objectStates);
    };

    Job.prototype.annotations.split.implementation = async function (objectState, frame) {
        return getCollection(this).split(objectState, frame);
    };

    Job.prototype.annotations.group.implementation = async function (objectStates, reset) {
        return getCollection(this).group(objectStates, reset);
    };

    Job.prototype.annotations.join.implementation = async function (objectStates, points) {
        return getCollection(this).join(objectStates, points);
    };

    Job.prototype.annotations.slice.implementation = async function (objectState, results) {
        return getCollection(this).slice(objectState, results);
    };

    Job.prototype.annotations.hasUnsavedChanges.implementation = function () {
        return getSaver(this).hasUnsavedChanges();
    };

    Job.prototype.annotations.clear.implementation = async function (
        reload, startframe, endframe, delTrackKeyframesOnly,
    ) {
        const result = await clearAnnotations(this, reload, startframe, endframe, delTrackKeyframesOnly);
        return result;
    };

    Job.prototype.annotations.select.implementation = function (objectStates, x, y) {
        return getCollection(this).select(objectStates, x, y);
    };

    Job.prototype.annotations.statistics.implementation = function () {
        return getCollection(this).statistics();
    };

    Job.prototype.annotations.put.implementation = function (objectStates) {
        return getCollection(this).put(objectStates);
    };

    Job.prototype.annotations.upload.implementation = async function (
        format: string,
        useDefaultLocation: boolean,
        sourceStorage: Storage,
        file: File | string,
        options?: { convMaskToPoly?: boolean },
    ) {
        const result = await importDataset(this, format, useDefaultLocation, sourceStorage, file, options);
        return result;
    };

    Job.prototype.annotations.import.implementation = function (data) {
        return getCollection(this).import(data);
    };

    Job.prototype.annotations.export.implementation = function () {
        return getCollection(this).export();
    };

    Job.prototype.annotations.exportDataset.implementation = async function (
        format: string,
        saveImages: boolean,
        useDefaultSettings: boolean,
        targetStorage: Storage,
        customName?: string,
    ) {
        const result = await exportDataset(this, format, saveImages, useDefaultSettings, targetStorage, customName);
        return result;
    };

    Job.prototype.actions.undo.implementation = async function (count) {
        return getHistory(this).undo(count);
    };

    Job.prototype.actions.redo.implementation = async function (count) {
        return getHistory(this).redo(count);
    };

    Job.prototype.actions.freeze.implementation = function (frozen) {
        return getHistory(this).freeze(frozen);
    };

    Job.prototype.actions.clear.implementation = function () {
        return getHistory(this).clear();
    };

    Job.prototype.actions.get.implementation = function () {
        return getHistory(this).get();
    };

    Job.prototype.logger.log.implementation = async function (scope, payload, wait) {
        const result = await logger.log(
            scope,
            {
                ...payload,
                project_id: this.projectId,
                task_id: this.taskId,
                job_id: this.id,
            },
            wait,
        );
        return result;
    };

    Job.prototype.close.implementation = function closeTask() {
        clearFrames(this.id);
        clearCache(this);
        return this;
    };

    Job.prototype.guide.implementation = async function guide() {
        if (this.guideId === null) {
            return null;
        }

        const result = await serverProxy.guides.get(this.guideId);
        return new AnnotationGuide(result);
    };

    return Job;
}

export function implementTask(Task) {
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

    Task.prototype.annotations.clear.implementation = async function (
        reload, startframe, endframe, delTrackKeyframesOnly,
    ) {
        const result = await clearAnnotations(this, reload, startframe, endframe, delTrackKeyframesOnly);
        return result;
    };

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
