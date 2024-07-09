// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { ConsensusSettings, Task } from 'cvat-core-wrapper';

export enum ConsensusActionTypes {
    OPEN_CONSENSUS_MODAL = 'OPEN_CONSENSUS_MODAL',
    CLOSE_CONSENSUS_MODAL = 'CLOSE_CONSENSUS_MODAL',
    SET_FETCHING = 'SET_FETCHING',
    SET_CONSENSUS_SETTINGS = 'SET_CONSENSUS_SETTINGS',
    MERGE_CONSENSUS_JOBS = 'MERGE_CONSENSUS_JOBS',
    MERGE_CONSENSUS_JOBS_SUCCESS = 'MERGE_CONSENSUS_JOBS_SUCCESS',
    MERGE_CONSENSUS_JOBS_FAILED = 'MERGE_CONSENSUS_JOBS_FAILED',
}

export const consensusActions = {
    openConsensusModal: (instance: any) => (
        createAction(ConsensusActionTypes.OPEN_CONSENSUS_MODAL, { instance })
    ),
    closeConsensusModal: (instance: any) => (
        createAction(ConsensusActionTypes.CLOSE_CONSENSUS_MODAL, { instance })
    ),
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

export type ConsensusActions = ActionUnion<typeof consensusActions>;
