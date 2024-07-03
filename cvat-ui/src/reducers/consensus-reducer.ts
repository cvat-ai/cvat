// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ConsensusActions, ConsensusActionTypes } from 'actions/consensus-actions';
import { ConsensusState } from '.';

const defaultState: ConsensusState = {
    taskInstance: null,
    fetching: true,
    consensusSettings: null,
    mergingConsensus: {},
};

export default (state: ConsensusState = defaultState, action: ConsensusActions): ConsensusState => {
    switch (action.type) {
        case ConsensusActionTypes.OPEN_CONSENSUS_MODAL: {
            const { instance } = action.payload;

            console.log('OPEN_CONSENSUS_MODAL');

            return {
                ...state,
                taskInstance: instance,
            };
        }
        case ConsensusActionTypes.CLOSE_CONSENSUS_MODAL: {
            return {
                ...state,
                taskInstance: null,
            };
        }
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

            mergingConsensus[taskID] = true;

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

            mergingConsensus[taskID] = false;

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

            delete mergingConsensus[taskID];

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
