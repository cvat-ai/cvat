// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import JobItem from 'components/job-item/job-item';
import {
    Job, JobType, QualityReport, QualitySettings, Task, getCore,
} from 'cvat-core-wrapper';
import React, { useEffect, useReducer } from 'react';
import { useIsMounted } from 'utils/hooks';
import { ActionUnion, createAction } from 'utils/redux';
import EmptyGtJob from './empty-job';
import GtConflicts from './gt-conflicts';
import Issues from './issues';
import JobList from './job-list';
import MeanQuality from './mean-quality';
import QualitySettingsModal from '../shared/quality-settings-modal';

const core = getCore();

interface Props {
    task: Task;
    onJobUpdate: (job: Job) => void;
}

interface State {
    fetching: boolean;
    taskReport: QualityReport | null;
    jobsReports: QualityReport[];
    qualitySettings: {
        settings: QualitySettings | null;
        fetching: boolean;
        visible: boolean;
    },
}

enum ReducerActionType {
    SET_FETCHING = 'SET_FETCHING',
    SET_TASK_REPORT = 'SET_TASK_REPORT',
    SET_JOBS_REPORTS = 'SET_JOBS_REPORTS',
    SET_QUALITY_SETTINGS = 'SET_QUALITY_SETTINGS',
    SET_QUALITY_SETTINGS_VISIBLE = 'SET_QUALITY_SETTINGS_VISIBLE',
    SET_QUALITY_SETTINGS_FETCHING = 'SET_QUALITY_SETTINGS_FETCHING',
}

export const reducerActions = {
    setFetching: (fetching: boolean) => (
        createAction(ReducerActionType.SET_FETCHING, { fetching })
    ),
    setTaskReport: (qualityReport: QualityReport) => (
        createAction(ReducerActionType.SET_TASK_REPORT, { qualityReport })
    ),
    setJobsReports: (qualityReports: QualityReport[]) => (
        createAction(ReducerActionType.SET_JOBS_REPORTS, { qualityReports })
    ),
    setQualitySettings: (qualitySettings: QualitySettings) => (
        createAction(ReducerActionType.SET_QUALITY_SETTINGS, { qualitySettings })
    ),
    setQualitySettingsVisible: (visible: boolean) => (
        createAction(ReducerActionType.SET_QUALITY_SETTINGS_VISIBLE, { visible })
    ),
    setQualitySettingsFetching: (fetching: boolean) => (
        createAction(ReducerActionType.SET_QUALITY_SETTINGS_FETCHING, { fetching })
    ),
};

const reducer = (state: State, action: ActionUnion<typeof reducerActions>): State => {
    if (action.type === ReducerActionType.SET_FETCHING) {
        return {
            ...state,
            fetching: action.payload.fetching,
        };
    }

    if (action.type === ReducerActionType.SET_TASK_REPORT) {
        return {
            ...state,
            taskReport: action.payload.qualityReport,
        };
    }

    if (action.type === ReducerActionType.SET_JOBS_REPORTS) {
        return {
            ...state,
            jobsReports: action.payload.qualityReports,
        };
    }

    if (action.type === ReducerActionType.SET_QUALITY_SETTINGS) {
        return {
            ...state,
            qualitySettings: {
                ...state.qualitySettings,
                settings: action.payload.qualitySettings,
            },
        };
    }

    if (action.type === ReducerActionType.SET_QUALITY_SETTINGS_VISIBLE) {
        return {
            ...state,
            qualitySettings: {
                ...state.qualitySettings,
                visible: action.payload.visible,
            },
        };
    }

    if (action.type === ReducerActionType.SET_QUALITY_SETTINGS_FETCHING) {
        return {
            ...state,
            qualitySettings: {
                ...state.qualitySettings,
                fetching: action.payload.fetching,
            },
        };
    }

    return state;
};

function TaskQualityComponent(props: Props): JSX.Element {
    const { task, onJobUpdate } = props;
    const isMounted = useIsMounted();

    const [state, dispatch] = useReducer(reducer, {
        fetching: true,
        taskReport: null,
        jobsReports: [],
        qualitySettings: {
            settings: null,
            fetching: true,
            visible: false,
        },
    });

    useEffect(() => {
        dispatch(reducerActions.setFetching(true));
        dispatch(reducerActions.setQualitySettingsFetching(true));

        function handleError(error: Error): void {
            if (isMounted()) {
                notification.error({
                    description: error.toString(),
                    message: 'Could not initialize quality analytics page',
                });
            }
        }

        core.analytics.quality.reports({ pageSize: 1, target: 'task', taskID: task.id }).then(([report]) => {
            let reportRequest = Promise.resolve<QualityReport[]>([]);
            if (report) {
                reportRequest = core.analytics.quality.reports({
                    pageSize: task.jobs.length,
                    parentID: report.id,
                    target: 'job',
                });
            }
            const settingsRequest = core.analytics.quality.settings.get({ taskID: task.id });

            Promise.all([reportRequest, settingsRequest]).then(([jobReports, settings]) => {
                dispatch(reducerActions.setQualitySettings(settings));
                dispatch(reducerActions.setTaskReport(report || null));
                dispatch(reducerActions.setJobsReports(jobReports));
            }).catch(handleError).finally(() => {
                dispatch(reducerActions.setQualitySettingsFetching(false));
                dispatch(reducerActions.setFetching(false));
            });
        }).catch(handleError);
    }, [task?.id]);

    const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);

    const {
        fetching, taskReport, jobsReports,
        qualitySettings: {
            settings: qualitySettings, fetching: qualitySettingsFetching, visible: qualitySettingsVisible,
        },
    } = state;

    return (
        <div className='cvat-task-quality-page'>
            {
                fetching ? (
                    <CVATLoadingSpinner size='large' />
                ) : (
                    <>
                        {
                            gtJob ? (
                                <>
                                    <Row>
                                        <MeanQuality
                                            taskReport={taskReport}
                                            setQualitySettingsVisible={
                                                (visible) => dispatch(reducerActions.setQualitySettingsVisible(visible))
                                            }
                                            taskID={task.id}
                                        />
                                    </Row>
                                    <Row gutter={16}>
                                        <GtConflicts taskReport={taskReport} />
                                        <Issues task={task} />
                                    </Row>
                                    {
                                        (!(gtJob && gtJob.stage === 'acceptance' && gtJob.state === 'completed')) ? (
                                            <Row>
                                                <Text type='secondary' className='cvat-task-quality-reports-hint'>
                                                    Quality reports are not computed unless the GT job is in the&nbsp;
                                                    <strong>completed state</strong>
                                                    &nbsp;and&nbsp;
                                                    <strong>acceptance stage.</strong>
                                                </Text>
                                            </Row>
                                        ) : null
                                    }
                                    <Row>
                                        <JobItem job={gtJob} task={task} onJobUpdate={onJobUpdate} />
                                    </Row>
                                    <Row>
                                        <JobList jobsReports={jobsReports} task={task} />
                                    </Row>
                                </>
                            ) : (
                                <Row justify='center'>
                                    <EmptyGtJob taskID={task.id} />
                                </Row>
                            )
                        }
                        <QualitySettingsModal
                            fetching={qualitySettingsFetching}
                            qualitySettings={qualitySettings}
                            setQualitySettings={
                                (settings) => dispatch(reducerActions.setQualitySettings(settings))
                            }
                            visible={qualitySettingsVisible}
                            setVisible={
                                (visible) => dispatch(reducerActions.setQualitySettingsVisible(visible))
                            }
                        />
                    </>
                )
            }
        </div>
    );
}

export default React.memo(TaskQualityComponent);
