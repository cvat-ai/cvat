// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import { JobsActions, JobsActionTypes } from 'actions/jobs-actions';
import { JobsState } from '.';

const defaultState: JobsState = {
    fetchingTimestamp: Date.now(),
    fetching: false,
    count: 0,
    query: {
        page: 1,
        filter: null,
        sort: null,
        search: null,
    },
    current: [],
    previews: {},
    activities: {
        deletes: {},
    },
};

export default (state: JobsState = defaultState, action: JobsActions): JobsState => {
    switch (action.type) {
        case JobsActionTypes.GET_JOBS: {
            return {
                ...state,
                fetchingTimestamp: action.payload.fetchingTimestamp,
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
                count: action.payload.jobs.count,
                current: action.payload.jobs,
            };
        }
        case JobsActionTypes.GET_JOBS_FAILED: {
            return {
                ...state,
                fetching: false,
            };
        }
        case JobsActionTypes.GET_JOB_PREVIEW: {
            const { jobID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [jobID]: {
                        preview: '',
                        fetching: true,
                        initialized: false,
                    },
                },
            };
        }
        case JobsActionTypes.GET_JOB_PREVIEW_SUCCESS: {
            const { jobID, preview } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [jobID]: {
                        preview,
                        fetching: false,
                        initialized: true,
                    },
                },
            };
        }
        case JobsActionTypes.GET_JOB_PREVIEW_FAILED: {
            const { jobID } = action.payload;
            const { previews } = state;
            return {
                ...state,
                previews: {
                    ...previews,
                    [jobID]: {
                        ...previews[jobID],
                        fetching: false,
                        initialized: true,
                    },
                },
            };
        }
        case JobsActionTypes.DELETE_JOB: {
            const { jobID } = action.payload;
            const { deletes } = state.activities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                        [jobID]: false,
                    },
                },
            };
        }
        case JobsActionTypes.DELETE_JOB_SUCCESS: {
            const { jobID } = action.payload;
            const { deletes } = state.activities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                        [jobID]: true,
                    },
                },
            };
        }
        case JobsActionTypes.DELETE_JOB_FAILED: {
            const { jobID } = action.payload;
            const { deletes } = state.activities;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: _.omit(deletes, jobID),
                },
            };
        }
        case JobsActionTypes.UPDATE_JOB: {
            return {
                ...state,
                fetching: true,
            };
        }
        case JobsActionTypes.UPDATE_JOB_SUCCESS: {
            return {
                ...state,
                current: state.current.includes(action.payload.job) ? (
                    state.current.map((job) => {
                        if (job === action.payload.job) {
                            return action.payload.job;
                        }
                        return job;
                    })
                ) : state.current,
                fetching: false,
            };
        }
        case JobsActionTypes.UPDATE_JOB_FAILED: {
            return {
                ...state,
                fetching: false,
            };
        }
        default: {
            return state;
        }
    }
};
