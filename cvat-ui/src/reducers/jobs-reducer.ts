// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { JobsActions, JobsActionTypes } from 'actions/jobs-actions';
import { JobsState } from './interfaces';

const defaultState: JobsState = {
    initialized: false,
    fetching: false,
    count: 0,
    query: {
        page: 1,
        id: null,
        state: null,
        stage: null,
        assignee: null,
    },
    current: [],
    previews: [],
};

export default (state: JobsState = defaultState, action: JobsActions): JobsState => {
    switch (action.type) {
        case JobsActionTypes.GET_JOBS: {
            return {
                ...state,
                fetching: true,
                query: {
                    ...defaultState.query,
                    ...action.payload.query,
                },
            };
        }
        case JobsActionTypes.GET_JOBS_SUCCESS: {
            return {
                ...state,
                fetching: false,
                initialized: true,
                current: action.payload.jobs,
                previews: action.payload.previews,
            };
        }
        case JobsActionTypes.GET_JOBS_FAILED: {
            return {
                ...state,
                fetching: false,
                initialized: true,
            };
        }
        default: {
            return state;
        }
    }
};
