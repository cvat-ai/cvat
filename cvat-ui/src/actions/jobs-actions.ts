// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { getCore } from 'cvat-core-wrapper';
import { Indexable, JobsQuery } from 'reducers';

const cvat = getCore();

export enum JobsActionTypes {
    GET_JOBS = 'GET_JOBS',
    GET_JOBS_SUCCESS = 'GET_JOBS_SUCCESS',
    GET_JOBS_FAILED = 'GET_JOBS_FAILED',
}

interface JobsList extends Array<any> {
    count: number;
}

const jobsActions = {
    getJobs: (query: Partial<JobsQuery>) => createAction(JobsActionTypes.GET_JOBS, { query }),
    getJobsSuccess: (jobs: JobsList, previews: string[]) => (
        createAction(JobsActionTypes.GET_JOBS_SUCCESS, { jobs, previews })
    ),
    getJobsFailed: (error: any) => createAction(JobsActionTypes.GET_JOBS_FAILED, { error }),
};

export type JobsActions = ActionUnion<typeof jobsActions>;

export const getJobsAsync = (query: JobsQuery): ThunkAction => async (dispatch) => {
    try {
        // We remove all keys with null values from the query
        const filteredQuery = { ...query };
        for (const key of Object.keys(query)) {
            if ((filteredQuery as Indexable)[key] === null) {
                delete (filteredQuery as Indexable)[key];
            }
        }

        dispatch(jobsActions.getJobs(filteredQuery));
        const jobs = await cvat.jobs.get(filteredQuery);
        const previewPromises = jobs.map((job: any) => (job as any).frames.preview().catch(() => ''));
        dispatch(jobsActions.getJobsSuccess(jobs, await Promise.all(previewPromises)));
    } catch (error) {
        dispatch(jobsActions.getJobsFailed(error));
    }
};
