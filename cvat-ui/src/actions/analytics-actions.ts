// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore, QualityReport, Task } from 'cvat-core-wrapper';
import { Dispatch, ActionCreator } from 'redux';
import { QualityQuery } from 'reducers';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
// import { filterNull } from 'utils/filter-null';

const cvat = getCore();

export enum AnalyticsActionsTypes {
    GET_QUALITY_REPORTS = 'GET_QUALITY_REPORTS',
    GET_QUALITY_REPORTS_SUCCESS = 'GET_QUALITY_REPORTS_SUCCESS',
    GET_QUALITY_REPORTS_FAILED = 'GET_QUALITY_REPORTS_FAILED',
}

const analyticsActions = {
    getQualityReports: (task: Task, query: QualityQuery) => (
        createAction(AnalyticsActionsTypes.GET_QUALITY_REPORTS, { query })
    ),
    getQualityReportsSuccess: (tasksReports: QualityReport[], jobsReports: QualityReport[]) => createAction(
        AnalyticsActionsTypes.GET_QUALITY_REPORTS_SUCCESS, { tasksReports, jobsReports },
    ),
    getQualityReportsFailed: (error: any) => createAction(AnalyticsActionsTypes.GET_QUALITY_REPORTS_FAILED, { error }),
};

export const getQualityReportsAsync = (task: Task, query: QualityQuery): ThunkAction => (
    async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(analyticsActions.getQualityReports(task, query));

        // const filteredQuery = filterNull(query);

        try {
            // reports are returned in order -created_date
            const [taskReport] = await cvat.analytics.quality.reports({ taskId: task.id, target: 'task' });
            const jobReports = await cvat.analytics.quality.reports({ taskId: task.id, target: 'job' });
            const jobIds = task.jobs.map((job) => job.id);
            const relevantReports: QualityReport[] = [];
            jobIds.forEach((jobId: number) => {
                const report = jobReports.find((_report: QualityReport) => _report.jobId === jobId);
                if (report) relevantReports.push(report);
            });

            dispatch(analyticsActions.getQualityReportsSuccess(taskReport ? [taskReport] : [], relevantReports));
        } catch (error) {
            dispatch(analyticsActions.getQualityReportsFailed(error));
        }
    }
);

export type AnalyticsActions = ActionUnion<typeof analyticsActions>;
