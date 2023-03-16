// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';
import { JobsQuery, Job } from 'reducers';
import { filterNull } from 'utils/filter-null';

const cvat = getCore();

export enum JobsActionTypes {
    GET_JOBS = 'GET_JOBS',
    GET_JOBS_SUCCESS = 'GET_JOBS_SUCCESS',
    GET_JOBS_FAILED = 'GET_JOBS_FAILED',
    GET_JOB_PREVIEW = 'GET_JOB_PREVIEW',
    GET_JOB_PREVIEW_SUCCESS = 'GET_JOB_PREVIEW_SUCCESS',
    GET_JOB_PREVIEW_FAILED = 'GET_JOB_PREVIEW_FAILED',
}

interface JobsList extends Array<any> {
    count: number;
}

const jobsActions = {
    getJobs: (query: Partial<JobsQuery>) => createAction(JobsActionTypes.GET_JOBS, { query }),
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
};

export type JobsActions = ActionUnion<typeof jobsActions>;

export const getJobsAsync = (query: JobsQuery): ThunkAction => async (dispatch) => {
    try {
        // We remove all keys with null values from the query
        const filteredQuery = filterNull(query);

        dispatch(jobsActions.getJobs(filteredQuery as JobsQuery));
        const jobs = await cvat.jobs.get(filteredQuery);
        dispatch(jobsActions.getJobsSuccess(jobs));
    } catch (error) {
        dispatch(jobsActions.getJobsFailed(error));
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
