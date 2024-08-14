// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import moment from 'moment';
import { Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import {
    AssigneeConsensusReport, ConsensusReport, Task, getCore,
} from 'cvat-core-wrapper';
import React, {
    useCallback, useEffect, useReducer, useState,
} from 'react';
import { useIsMounted } from 'utils/hooks';
import { ActionUnion, createAction } from 'utils/redux';
import { Tabs } from 'antd';
import ConsensusConflicts from './consensus-conflicts';
import Issues from './issues';
import JobList from './job-list';
import AssigneeListComponent from './assignee-list';
import MeanQuality from './mean-score';

const core = getCore();

enum DetailsTabs {
    JOBS = 'jobs',
    ASSIGNEES = 'assignees',
}

interface Props {
    task: Task;
}

interface State {
    fetching: boolean;
    taskReport: ConsensusReport | null;
    jobsReports: ConsensusReport[];
    assigneeReports: AssigneeConsensusReport[];
}

enum ReducerActionType {
    SET_FETCHING = 'SET_FETCHING',
    SET_TASK_REPORT = 'SET_TASK_REPORT',
    SET_JOBS_REPORTS = 'SET_JOBS_REPORTS',
    SET_ASSIGNEE_REPORTS = 'SET_ASSIGNEE_REPORTS',
}

export const reducerActions = {
    setFetching: (fetching: boolean) => (
        createAction(ReducerActionType.SET_FETCHING, { fetching })
    ),
    setTaskReport: (consensusReport: ConsensusReport) => (
        createAction(ReducerActionType.SET_TASK_REPORT, { consensusReport })
    ),
    setJobsReports: (consensusReports: ConsensusReport[]) => (
        createAction(ReducerActionType.SET_JOBS_REPORTS, { consensusReports })
    ),
    setAssigneeReports: (assigneeconsensusReports: AssigneeConsensusReport[]) => (
        createAction(ReducerActionType.SET_ASSIGNEE_REPORTS, { assigneeconsensusReports })
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
        const taskReport = action.payload.consensusReport;
        return {
            ...state,
            taskReport,
        };
    }

    if (action.type === ReducerActionType.SET_JOBS_REPORTS) {
        const jobsReports = action.payload.consensusReports;
        return {
            ...state,
            jobsReports,
        };
    }

    if (action.type === ReducerActionType.SET_ASSIGNEE_REPORTS) {
        const assigneeReports = action.payload.assigneeconsensusReports;
        return {
            ...state,
            assigneeReports,
        };
    }

    return state;
};

function getTabFromHash(): DetailsTabs {
    const tab = window.location.hash.slice(1) as DetailsTabs;
    return Object.values(DetailsTabs).includes(tab) ? tab : DetailsTabs.JOBS;
}

function TaskConsensusComponent(props: Props): JSX.Element {
    const { task } = props;
    const isMounted = useIsMounted();
    let tabs = null;

    const [state, dispatch] = useReducer(reducer, {
        fetching: true,
        taskReport: null,
        jobsReports: [],
        assigneeReports: [],
    });
    const [activeTab, setTab] = useState(getTabFromHash());

    useEffect(() => {
        dispatch(reducerActions.setFetching(true));

        function handleError(error: Error): void {
            if (isMounted()) {
                notification.error({
                    description: error.toString(),
                    message: 'Could not initialize consensus analytics page',
                });
            }
        }

        core.consensus
            .reports({
                pageSize: 1, target: 'task', jobID: null, taskID: task.id,
            })
            .then(([report]) => {
                let reportRequest = Promise.resolve<ConsensusReport[]>([]);
                let assigneeReportRequest = Promise.resolve<AssigneeConsensusReport[]>([]);
                if (report) {
                    reportRequest = core.consensus.reports({
                        pageSize: task.jobs.length,
                        taskID: task.id,
                        target: 'job',
                    });
                    assigneeReportRequest = core.consensus.assigneeReports({
                        taskID: task.id,
                        consensusReportID: report.id,
                    });
                }

                Promise.all([reportRequest])
                    .then(([jobReports]) => {
                        dispatch(reducerActions.setTaskReport(report || null));
                        dispatch(reducerActions.setJobsReports(jobReports));
                        Promise.all([assigneeReportRequest])
                            .then(([assigneeReports]) => {
                                dispatch(reducerActions.setAssigneeReports(assigneeReports));
                            });
                    })
                    .catch(handleError)
                    .finally(() => {
                        dispatch(reducerActions.setFetching(false));
                    });
            })
            .catch(handleError);
    }, [task?.id]);

    const {
        fetching, taskReport, jobsReports, assigneeReports,
    } = state;

    const onTabKeyChange = useCallback((key: string): void => {
        setTab(key as DetailsTabs);
    }, []);

    tabs = (
        <Tabs
            type='card'
            activeKey={activeTab}
            defaultActiveKey={DetailsTabs.JOBS}
            onChange={onTabKeyChange}
            className='cvat-task-analytics-tabs'
            items={[
                {
                    key: DetailsTabs.JOBS,
                    label: 'Jobs',
                    children: <JobList jobsReports={jobsReports} task={task} />,
                },
                {
                    key: DetailsTabs.ASSIGNEES,
                    label: 'Assignees',
                    children: <AssigneeListComponent assigneeReports={assigneeReports} task={task} />,
                },
            ]}
        />
    );

    return (
        <div className='cvat-task-quality-page'>
            {fetching ? (
                <CVATLoadingSpinner size='large' />
            ) : (
                <>
                    <Row>
                        <Text type='secondary'>
                            {`Created ${taskReport?.id ? moment(taskReport.createdDate).fromNow() : ''}`}
                        </Text>
                    </Row>
                    <Row>
                        <MeanQuality taskReport={taskReport} taskID={task.id} />
                    </Row>
                    <Row gutter={16}>
                        <ConsensusConflicts taskReport={taskReport} />
                        <Issues task={task} />
                    </Row>
                    <Row>{tabs}</Row>
                </>
            )}
        </div>
    );
}

export default React.memo(TaskConsensusComponent);
