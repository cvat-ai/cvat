// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore, QualityReport } from 'cvat-core-wrapper';
import { Dispatch, ActionCreator } from 'redux';
import { QualityQuery } from 'reducers';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { filterNull } from 'utils/filter-null';

const cvat = getCore();

export enum AnalyticsActionsTypes {
    GET_QUALITY_REPORTS = 'GET_QUALITY_REPORTS',
    GET_QUALITY_REPORTS_SUCCESS = 'GET_QUALITY_REPORTS_SUCCESS',
    GET_QUALITY_REPORTS_FAILED = 'GET_QUALITY_REPORTS_FAILED',
}

const analyticsActions = {
    getQualityReports: (query: QualityQuery) => createAction(AnalyticsActionsTypes.GET_QUALITY_REPORTS, { query }),
    getQualityReportsSuccess: (tasksReports: QualityReport[], jobsReports: QualityReport[]) => createAction(
        AnalyticsActionsTypes.GET_QUALITY_REPORTS_SUCCESS, { tasksReports, jobsReports },
    ),
    getQualityReportsFailed: (error: any) => createAction(AnalyticsActionsTypes.GET_QUALITY_REPORTS_FAILED, { error }),
};

export const getQualityReportsAsync = (query: QualityQuery): ThunkAction => (
    async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(analyticsActions.getQualityReports(query));

        const filteredQuery = filterNull(query);

        try {
            await cvat.analytics.quality.get(filteredQuery);
        } catch (error) {
            dispatch(analyticsActions.getQualityReportsFailed(error));
            return;
        }

        dispatch(analyticsActions.getQualityReportsSuccess([], []));
    }
);

export type AnalyticsActions = ActionUnion<typeof analyticsActions>;
