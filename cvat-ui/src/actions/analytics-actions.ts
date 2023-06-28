// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    getCore, QualityReport, QualitySettings, Task,
} from 'cvat-core-wrapper';
import { Dispatch, ActionCreator } from 'redux';
import { QualityQuery } from 'reducers';
import { ActionUnion, createAction, ThunkAction } from 'utils/redux';

const cvat = getCore();

export enum AnalyticsActionsTypes {
    GET_QUALITY_REPORTS = 'GET_QUALITY_REPORTS',
    GET_QUALITY_REPORTS_SUCCESS = 'GET_QUALITY_REPORTS_SUCCESS',
    GET_QUALITY_REPORTS_FAILED = 'GET_QUALITY_REPORTS_FAILED',
    SWITCH_QUALITY_SETTINGS_VISIBLE = 'SWITCH_QUALITY_SETTINGS_VISIBLE',
    GET_QUALITY_SETTINGS = 'GET_QUALITY_SETTINS',
    GET_QUALITY_SETTINGS_SUCCESS = 'GET_QUALITY_SETTINGS_SUCCESS',
    GET_QUALITY_SETTINGS_FAILED = 'GET_QUALITY_SETTINGS_FAILED',
    UPDATE_QUALITY_SETTINGS = 'UPDATE_QUALITY_SETTINGS',
    UPDATE_QUALITY_SETTINGS_SUCCESS = 'UPDATE_QUALITY_SETTINGS_SUCCESS',
    UPDATE_QUALITY_SETTINGS_FAILED = 'UPDATE_QUALITY_SETTINGS_FAILED',
}

export const analyticsActions = {
    getQualityReports: (task: Task, query: QualityQuery) => (
        createAction(AnalyticsActionsTypes.GET_QUALITY_REPORTS, { query })
    ),
    getQualityReportsSuccess: (tasksReports: QualityReport[], jobsReports: QualityReport[]) => createAction(
        AnalyticsActionsTypes.GET_QUALITY_REPORTS_SUCCESS, { tasksReports, jobsReports },
    ),
    getQualityReportsFailed: (error: any) => createAction(AnalyticsActionsTypes.GET_QUALITY_REPORTS_FAILED, { error }),
    switchQualitySettingsVisible: (visible: boolean) => (
        createAction(AnalyticsActionsTypes.SWITCH_QUALITY_SETTINGS_VISIBLE, { visible })
    ),
    getQualitySettings: (settingsID: number) => (
        createAction(AnalyticsActionsTypes.GET_QUALITY_SETTINGS, { settingsID })
    ),
    getQualitySettingsSuccess: (settings: QualitySettings) => (
        createAction(AnalyticsActionsTypes.GET_QUALITY_SETTINGS_SUCCESS, { settings })
    ),
    getQualitySettingsFailed: (error: any) => (
        createAction(AnalyticsActionsTypes.GET_QUALITY_SETTINGS_FAILED, { error })
    ),
    updateQualitySettings: (settings: QualitySettings) => (
        createAction(AnalyticsActionsTypes.UPDATE_QUALITY_SETTINGS, { settings })
    ),
    updateQualitySettingsSuccess: (settings: QualitySettings) => (
        createAction(AnalyticsActionsTypes.UPDATE_QUALITY_SETTINGS_SUCCESS, { settings })
    ),
    updateQualitySettingsFailed: (error: any) => (
        createAction(AnalyticsActionsTypes.UPDATE_QUALITY_SETTINGS_FAILED, { error })
    ),
};

export const getQualityReportsAsync = (task: Task, query: QualityQuery): ThunkAction => (
    async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(analyticsActions.getQualityReports(task, query));

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

export const getQualitySettingsAsync = (task: Task): ThunkAction => (
    async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(analyticsActions.getQualitySettings(task.id));
        try {
            const qualitySettings = await cvat.analytics.quality.settings.get(task.id);

            dispatch(analyticsActions.getQualitySettingsSuccess(qualitySettings));
        } catch (error) {
            dispatch(analyticsActions.getQualityReportsFailed(error));
        }
    }
);

export const updateQualitySettingsAsync = (qualitySettings: QualitySettings): ThunkAction => (
    async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(analyticsActions.updateQualitySettings(qualitySettings));

        try {
            const updatedQualitySettings = await qualitySettings.save();
            dispatch(analyticsActions.updateQualitySettingsSuccess(updatedQualitySettings));
        } catch (error) {
            dispatch(analyticsActions.updateQualitySettingsFailed(error));
            throw error;
        }
    }
);

export type AnalyticsActions = ActionUnion<typeof analyticsActions>;
