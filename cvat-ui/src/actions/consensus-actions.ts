// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { Project, ProjectOrTaskOrJob } from 'cvat-core-wrapper';

export enum ConsensusActionTypes {
    MERGE_CONSENSUS_JOBS = 'MERGE_CONSENSUS_JOBS',
    MERGE_CONSENSUS_JOBS_SUCCESS = 'MERGE_CONSENSUS_JOBS_SUCCESS',
    MERGE_CONSENSUS_JOBS_FAILED = 'MERGE_CONSENSUS_JOBS_FAILED',
}

export const consensusActions = {
    mergeConsensusJobs: (instance: Exclude<ProjectOrTaskOrJob, Project>) => (
        createAction(ConsensusActionTypes.MERGE_CONSENSUS_JOBS, { instance })
    ),
    mergeConsensusJobsSuccess: (instance: Exclude<ProjectOrTaskOrJob, Project>) => (
        createAction(ConsensusActionTypes.MERGE_CONSENSUS_JOBS_SUCCESS, { instance })
    ),
    mergeConsensusJobsFailed: (instance: Exclude<ProjectOrTaskOrJob, Project>, error: any) => (
        createAction(ConsensusActionTypes.MERGE_CONSENSUS_JOBS_FAILED, { instance, error })
    ),
};

export const mergeConsensusJobsAsync = (
    instance: Exclude<ProjectOrTaskOrJob, Project>,
): ThunkAction => async (dispatch) => {
    try {
        dispatch(consensusActions.mergeConsensusJobs(instance));
        await instance.mergeConsensusJobs();
    } catch (error) {
        dispatch(consensusActions.mergeConsensusJobsFailed(instance, error));
        return;
    }

    dispatch(consensusActions.mergeConsensusJobsSuccess(instance));
};

export type ConsensusActions = ActionUnion<typeof consensusActions>;
