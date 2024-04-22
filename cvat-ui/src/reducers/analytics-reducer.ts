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
        settings: {
            modalVisible: false,
            fetching: false,
            current: null,
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
        case AnalyticsActionsTypes.SWITCH_QUALITY_SETTINGS_VISIBLE:
            return {
                ...state,
                quality: {
                    ...state.quality,
                    settings: {
                        ...state.quality.settings,
                        modalVisible: action.payload.visible,
                    },
                },
            };
        case AnalyticsActionsTypes.UPDATE_QUALITY_SETTINGS:
        case AnalyticsActionsTypes.GET_QUALITY_SETTINGS: {
            return {
                ...state,
                quality: {
                    ...state.quality,
                    settings: {
                        ...state.quality.settings,
                        fetching: true,
                    },
                },
            };
        }
        case AnalyticsActionsTypes.UPDATE_QUALITY_SETTINGS_SUCCESS:
        case AnalyticsActionsTypes.GET_QUALITY_SETTINGS_SUCCESS:
            return {
                ...state,
                quality: {
                    ...state.quality,
                    settings: {
                        ...state.quality.settings,
                        current: action.payload.settings,
                        fetching: false,
                    },
                },
            };
        case AnalyticsActionsTypes.UPDATE_QUALITY_SETTINGS_FAILED:
        case AnalyticsActionsTypes.GET_QUALITY_SETTINGS_FAILED:
            return {
                ...state,
                quality: {
                    ...state.quality,
                    settings: {
                        ...state.quality.settings,
                        fetching: false,
                    },
                },
            };
        default:
            return state;
    }
}
