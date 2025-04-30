// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Project, ProjectOrTaskOrJob } from 'cvat-core-wrapper';
import { ConsensusActions, ConsensusActionTypes } from 'actions/consensus-actions';
import { getInstanceType } from 'actions/common';
import { ConsensusState } from '.';

const defaultState: ConsensusState = {
    taskInstance: null,
    jobInstance: null,
    fetching: true,
    consensusSettings: null,
    actions: {
        merging: {},
    },
};

export function makeKey(instance: Exclude<ProjectOrTaskOrJob, Project>): string {
    return `${getInstanceType(instance)}_${instance.id}`;
}

export default (state: ConsensusState = defaultState, action: ConsensusActions): ConsensusState => {
    switch (action.type) {
        case ConsensusActionTypes.MERGE_CONSENSUS_JOBS: {
            const { instance } = action.payload;
            const { merging } = state.actions;

            merging[makeKey(instance)] = true;

            return {
                ...state,
                actions: {
                    ...state.actions,
                    merging: {
                        ...merging,
                    },
                },
            };
        }

        case ConsensusActionTypes.MERGE_CONSENSUS_JOBS_SUCCESS: {
            const { instance } = action.payload;
            const { merging } = state.actions;

            merging[makeKey(instance)] = false;

            return {
                ...state,
                actions: {
                    ...state.actions,
                    merging: {
                        ...merging,
                    },
                },
            };
        }
        case ConsensusActionTypes.MERGE_CONSENSUS_JOBS_FAILED: {
            const { instance } = action.payload;
            const { merging } = state.actions;

            delete merging[makeKey(instance)];

            return {
                ...state,
                actions: {
                    ...state.actions,
                    merging: {
                        ...merging,
                    },
                },
            };
        }
        default:
            return state;
    }
};
