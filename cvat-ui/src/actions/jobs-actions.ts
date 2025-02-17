// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import { getCore, Job } from 'cvat-core-wrapper';
import { JobsQuery } from 'reducers';
import { filterNull } from 'utils/filter-null';
import { JobData } from 'components/create-job-page/job-form';

const cvat = getCore();

export enum JobsActionTypes {
    GET_JOBS = 'GET_JOBS',
    GET_JOBS_SUCCESS = 'GET_JOBS_SUCCESS',
    GET_JOBS_FAILED = 'GET_JOBS_FAILED',
    GET_JOB_PREVIEW = 'GET_JOB_PREVIEW',
    GET_JOB_PREVIEW_SUCCESS = 'GET_JOB_PREVIEW_SUCCESS',
    GET_JOB_PREVIEW_FAILED = 'GET_JOB_PREVIEW_FAILED',
    CREATE_JOB_FAILED = 'CREATE_JOB_FAILED',
    UPDATE_JOB = 'UPDATE_JOB',
    UPDATE_JOB_SUCCESS = 'UPDATE_JOB_SUCCESS',
    UPDATE_JOB_FAILED = 'UPDATE_JOB_FAILED',
    DELETE_JOB = 'DELETE_JOB',
    DELETE_JOB_SUCCESS = 'DELETE_JOB_SUCCESS',
    DELETE_JOB_FAILED = 'DELETE_JOB_FAILED',
}

interface JobsList extends Array<any> {
    count: number;
}

const jobsActions = {
    getJobs: (query: Partial<JobsQuery>, fetchingTimestamp: number) => (
        createAction(JobsActionTypes.GET_JOBS, { query, fetchingTimestamp })
    ),
    getJobsSuccess: (jobs: JobsList) => (
        createAction(JobsActionTypes.GET_JOBS_SUCCESS, { jobs })
    ),
    getJobsFailed: (error: any) => createAction(JobsActionTypes.GET_JOBS_FAILED, { error }),
    getJobPreview: (jobID: number) => (
        createAction(JobsActionTypes.GET_JOB_PREVIEW, { jobID })
    ),
    getJobPreviewSuccess: (jobID: number, preview: string) => (
        createAction(JobsActionTypes.GET_JOB_PREVIEW_SUCCESS, { jobID, preview })
    ),
    getJobPreviewFailed: (jobID: number, error: any) => (
        createAction(JobsActionTypes.GET_JOB_PREVIEW_FAILED, { jobID, error })
    ),
    createJobFailed: (error: any) => (
        createAction(JobsActionTypes.CREATE_JOB_FAILED, { error })
    ),
    updateJob: () => (
        createAction(JobsActionTypes.UPDATE_JOB)
    ),
    updateJobSuccess: (job: Job) => (
        createAction(JobsActionTypes.UPDATE_JOB_SUCCESS, { job })
    ),
    updateJobFailed: (jobID: number, error: any) => (
        createAction(JobsActionTypes.UPDATE_JOB_FAILED, { jobID, error })
    ),
    deleteJob: (jobID: number) => (
        createAction(JobsActionTypes.DELETE_JOB, { jobID })
    ),
    deleteJobSuccess: (jobID: number) => (
        createAction(JobsActionTypes.DELETE_JOB_SUCCESS, { jobID })
    ),
    deleteJobFailed: (jobID: number, error: any) => (
        createAction(JobsActionTypes.DELETE_JOB_FAILED, { jobID, error })
    ),
};

export type JobsActions = ActionUnion<typeof jobsActions>;

export const getJobsAsync = (query: JobsQuery): ThunkAction => async (dispatch, getState) => {
    const requestedOn = Date.now();
    const isRequestRelevant = (): boolean => (
        getState().jobs.fetchingTimestamp === requestedOn
    );

    try {
        // We remove all keys with null values from the query
        const filteredQuery = filterNull(query);

        dispatch(jobsActions.getJobs(filteredQuery as JobsQuery, requestedOn));
        const jobs = await cvat.jobs.get(filteredQuery);

        if (isRequestRelevant()) {
            dispatch(jobsActions.getJobsSuccess(jobs));
        }
    } catch (error) {
        if (isRequestRelevant()) {
            dispatch(jobsActions.getJobsFailed(error));
        }
    }
};

export const getJobPreviewAsync = (job: Job): ThunkAction => async (dispatch) => {
    dispatch(jobsActions.getJobPreview(job.id));
    try {
        const result = await job.frames.preview();
        dispatch(jobsActions.getJobPreviewSuccess(job.id, result));
    } catch (error) {
        dispatch(jobsActions.getJobPreviewFailed(job.id, error));
    }
};

export const createJobAsync = (data: JobData): ThunkAction<Promise<Job>> => async (dispatch) => {
    const initialData = {
        type: data.type,
        task_id: data.taskID,
    };
    const jobInstance = new cvat.classes.Job(initialData);
    try {
        const extras = {
            frame_selection_method: data.frameSelectionMethod,
            seed: data.seed,
            frame_count: data.frameCount,
            frames_per_job_count: data.framesPerJobCount,
        };
        const savedJob = await jobInstance.save(extras);
        return savedJob;
    } catch (error) {
        dispatch(jobsActions.createJobFailed(error));
        throw error;
    }
};

export function updateJobAsync(
    jobInstance: Job,
    fields: Parameters<Job['save']>[0],
): ThunkAction<Promise<void>> {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            dispatch(jobsActions.updateJob());
            const updated = await jobInstance.save(fields);
            dispatch(jobsActions.updateJobSuccess(updated));
        } catch (error) {
            dispatch(jobsActions.updateJobFailed(jobInstance.id, error));
            throw error;
        }
    };
}

export const deleteJobAsync = (job: Job): ThunkAction => async (dispatch) => {
    dispatch(jobsActions.deleteJob(job.id));
    try {
        await job.delete();
    } catch (error) {
        dispatch(jobsActions.deleteJobFailed(job.id, error));
        return;
    }

    dispatch(jobsActions.deleteJobSuccess(job.id));
};
