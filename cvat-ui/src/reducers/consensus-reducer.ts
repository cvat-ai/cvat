// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ConsensusActions, ConsensusActionTypes } from 'actions/consensus-actions';
import { ConsensusState } from '.';

const defaultState: ConsensusState = {
    taskInstance: null,
    jobInstance: null,
    fetching: true,
    consensusSettings: null,
    mergingConsensus: {},
};

function makeKey(id: number, instance: string): string {
    return `${instance}_${id}`;
}

export default (state: ConsensusState = defaultState, action: ConsensusActions): ConsensusState => {
    switch (action.type) {
        case ConsensusActionTypes.SET_FETCHING: {
            return {
                ...state,
                fetching: action.payload.fetching,
            };
        }

        case ConsensusActionTypes.SET_CONSENSUS_SETTINGS: {
            return {
                ...state,
                consensusSettings: action.payload.consensusSettings,
            };
        }

        case ConsensusActionTypes.MERGE_CONSENSUS_JOBS: {
            const { taskID } = action.payload;
            const { mergingConsensus } = state;

            mergingConsensus[makeKey(taskID, 'task')] = true;

            return {
                ...state,
                mergingConsensus: {
                    ...mergingConsensus,
                },
            };
        }

        case ConsensusActionTypes.MERGE_CONSENSUS_JOBS_SUCCESS: {
            const { taskID } = action.payload;
            const { mergingConsensus } = state;

            mergingConsensus[makeKey(taskID, 'task')] = false;

            return {
                ...state,
                mergingConsensus: {
                    ...mergingConsensus,
                },
            };
        }
        case ConsensusActionTypes.MERGE_CONSENSUS_JOBS_FAILED: {
            const { taskID } = action.payload;
            const { mergingConsensus } = state;

            delete mergingConsensus[makeKey(taskID, 'task')];

            return {
                ...state,
                mergingConsensus: {
                    ...mergingConsensus,
                },
            };
        }
        case ConsensusActionTypes.MERGE_SPECIFIC_CONSENSUS_JOBS: {
            const { jobID } = action.payload;
            const { mergingConsensus } = state;

            mergingConsensus[makeKey(jobID, 'job')] = true;

            return {
                ...state,
                mergingConsensus: {
                    ...mergingConsensus,
                },
            };
        }
        case ConsensusActionTypes.MERGE_SPECIFIC_CONSENSUS_JOBS_SUCCESS: {
            const { jobID } = action.payload;
            const { mergingConsensus } = state;

            mergingConsensus[makeKey(jobID, 'job')] = false;

            return {
                ...state,
                mergingConsensus: {
                    ...mergingConsensus,
                },
            };
        }
        case ConsensusActionTypes.MERGE_SPECIFIC_CONSENSUS_JOBS_FAILED: {
            const { jobID } = action.payload;
            const { mergingConsensus } = state;

            delete mergingConsensus[makeKey(jobID, 'job')];

            return {
                ...state,
                mergingConsensus: {
                    ...mergingConsensus,
                },
            };
        }
        default:
            return state;
    }
};
