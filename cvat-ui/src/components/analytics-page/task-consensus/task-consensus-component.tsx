// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import JobItem from 'components/job-item/job-item';
import {
    Job, JobType, QualityReport, ConsensusSettings, Task,
} from 'cvat-core-wrapper';
import React, { useReducer } from 'react';
import { ActionUnion, createAction } from 'utils/redux';
import EmptyGtJob from '../task-quality/empty-job';
import GtConflicts from '../task-quality/gt-conflicts';
import Issues from '../task-quality/issues';
import JobList from '../task-quality/job-list';

interface Props {
    task: Task;
    onJobUpdate: (job: Job) => void;
}

interface State {
    fetching: boolean;
    taskReport: QualityReport | null;
    jobsReports: QualityReport[];
    consensusSettings: {
        settings: ConsensusSettings | null;
        fetching: boolean;
        visible: boolean;
    },
}

enum ReducerActionType {
    SET_FETCHING = 'SET_FETCHING',
    SET_TASK_REPORT = 'SET_TASK_REPORT',
    SET_JOBS_REPORTS = 'SET_JOBS_REPORTS',
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

    return state;
};

function TaskConsensusAnalyticsComponent(props: Props): JSX.Element {
    const { task, onJobUpdate } = props;

    const [state] = useReducer(reducer, {
        fetching: true,
        taskReport: null,
        jobsReports: [],
        consensusSettings: {
            settings: null,
            fetching: true,
            visible: false,
        },
    });

    // const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);
    const gtJob = task.jobs.find((job: Job) => job.type !== JobType.GROUND_TRUTH);

    const {
        fetching, taskReport, jobsReports,
    } = state;

    return (
        <div className='cvat-task-quality-page'>
            {(() => {
                if (fetching) {
                    return <CVATLoadingSpinner size='large' />;
                } if (gtJob) {
                    return (
                        <>
                            <Row gutter={16}>
                                <GtConflicts taskReport={taskReport} />
                                <Issues task={task} />
                            </Row>
                            {!(gtJob && gtJob.stage === 'acceptance' && gtJob.state === 'completed') && (
                                <Row>
                                    <Text type='secondary' className='cvat-task-quality-reports-hint'>
                                        Quality reports are not computed unless the GT job is in the&nbsp;
                                        <strong>completed state</strong>
                                        &nbsp;and&nbsp;
                                        <strong>acceptance stage.</strong>
                                    </Text>
                                </Row>
                            )}
                            <Row>
                                <JobItem job={gtJob} task={task} onJobUpdate={onJobUpdate} />
                            </Row>
                            <Row>
                                <JobList jobsReports={jobsReports} task={task} />
                            </Row>
                        </>
                    );
                }
                return (
                    <Row justify='center'>
                        <EmptyGtJob taskID={task.id} />
                    </Row>
                );
            })()}
        </div>
    );
}

export default React.memo(TaskConsensusAnalyticsComponent);
