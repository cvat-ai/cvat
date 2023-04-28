// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnalyticsActions, AnalyticsActionsTypes } from 'actions/analytics-actions';
import { AnalyticsState } from 'reducers';

const defaultState: AnalyticsState = {
    fetching: false,
    quality: {
        tasksReports: [],
        jobsReports: [],
        query: {
            taskId: null,
            jobId: null,
            parentId: null,
        },
    },
};

export default function (
    state: AnalyticsState = defaultState,
    action: AnalyticsActions,
): AnalyticsState {
    switch (action.type) {
        case AnalyticsActionsTypes.GET_QUALITY_REPORTS: {
            return {
                ...state,
                fetching: true,
                quality: {
                    ...state.quality,
                    query: {
                        ...action.payload.query,
                    },
                },
            };
        }
        case AnalyticsActionsTypes.GET_QUALITY_REPORTS_SUCCESS:
            return {
                ...state,
                fetching: false,
                quality: {
                    ...state.quality,
                    tasksReports: action.payload.tasksReports,
                    jobsReports: action.payload.jobsReports,
                },
            };
        case AnalyticsActionsTypes.GET_QUALITY_REPORTS_FAILED:
            return {
                ...state,
                fetching: false,
            };
        default:
            return state;
    }
}
