// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { ConsensusSettings, Job, Task } from 'cvat-core-wrapper';

export enum ConsensusActionTypes {
    SET_FETCHING = 'SET_FETCHING',
    SET_CONSENSUS_SETTINGS = 'SET_CONSENSUS_SETTINGS',
    MERGE_CONSENSUS_JOBS = 'MERGE_CONSENSUS_JOBS',
    MERGE_CONSENSUS_JOBS_SUCCESS = 'MERGE_CONSENSUS_JOBS_SUCCESS',
    MERGE_CONSENSUS_JOBS_FAILED = 'MERGE_CONSENSUS_JOBS_FAILED',
    MERGE_SPECIFIC_CONSENSUS_JOBS = 'MERGE_SPECIFIC_CONSENSUS_JOBS',
    MERGE_SPECIFIC_CONSENSUS_JOBS_SUCCESS = 'MERGE_SPECIFIC_CONSENSUS_JOBS_SUCCESS',
    MERGE_SPECIFIC_CONSENSUS_JOBS_FAILED = 'MERGE_SPECIFIC_CONSENSUS_JOBS_FAILED',
}

export const consensusActions = {
    setFetching: (fetching: boolean) => (
        createAction(ConsensusActionTypes.SET_FETCHING, { fetching })
    ),
    setConsensusSettings: (consensusSettings: ConsensusSettings) => (
        createAction(ConsensusActionTypes.SET_CONSENSUS_SETTINGS, { consensusSettings })
    ),
    mergeTaskConsensusJobs: (taskID: number) => (
        createAction(ConsensusActionTypes.MERGE_CONSENSUS_JOBS, { taskID })
    ),
    mergeTaskConsensusJobsSuccess: (taskID: number) => (
        createAction(ConsensusActionTypes.MERGE_CONSENSUS_JOBS_SUCCESS, { taskID })
    ),
    mergeTaskConsensusJobsFailed: (taskID: number, error: any) => (
        createAction(ConsensusActionTypes.MERGE_CONSENSUS_JOBS_FAILED, { taskID, error })
    ),
    mergeSpecificTaskConsensusJobs: (jobID: number) => (
        createAction(ConsensusActionTypes.MERGE_SPECIFIC_CONSENSUS_JOBS, { jobID })
    ),
    mergeSpecificTaskConsensusJobsSuccess: (jobID: number, taskID: number) => (
        createAction(ConsensusActionTypes.MERGE_SPECIFIC_CONSENSUS_JOBS_SUCCESS, { jobID, taskID })
    ),
    mergeSpecificTaskConsensusJobsFailed: (jobID: number, taskID: number, error: any) => (
        createAction(ConsensusActionTypes.MERGE_SPECIFIC_CONSENSUS_JOBS_FAILED, { jobID, taskID, error })
    ),
};

export const mergeTaskConsensusJobsAsync = (
    taskInstance: Task,
): ThunkAction => async (dispatch) => {
    try {
        dispatch(consensusActions.mergeTaskConsensusJobs(taskInstance.id));
        await taskInstance.mergeConsensusJobs();
    } catch (error) {
        dispatch(consensusActions.mergeTaskConsensusJobsFailed(taskInstance.id, error));
        return;
    }

    dispatch(consensusActions.mergeTaskConsensusJobsSuccess(taskInstance.id));
};

export const mergeTaskSpecificConsensusJobsAsync = (
    jobInstance: Job,
): ThunkAction => async (dispatch) => {
    try {
        dispatch(consensusActions.mergeSpecificTaskConsensusJobs(jobInstance.id));
        await jobInstance.mergeConsensusJobs();
    } catch (error) {
        dispatch(consensusActions.mergeSpecificTaskConsensusJobsFailed(jobInstance.id, jobInstance.taskId, error));
        return;
    }

    dispatch(consensusActions.mergeSpecificTaskConsensusJobsSuccess(jobInstance.id, jobInstance.taskId));
};

export type ConsensusActions = ActionUnion<typeof consensusActions>;
