// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import notification from 'antd/lib/notification';
import { useIsMounted } from 'utils/hooks';
import { Project, Task } from 'reducers';
import { AnalyticsReport, Job, getCore } from 'cvat-core-wrapper';
import moment from 'moment';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import AnalyticsOverview, { DateIntervals } from './analytics-performance';
import TaskQualityComponent from './task-quality/task-quality-component';
import ProjectQualityComponent from './project-quality/project-quality-component';

const core = getCore();

function handleTimePeriod(interval: DateIntervals): [string, string] {
    const now = moment.utc();
    switch (interval) {
        case DateIntervals.LAST_WEEK: {
            return [now.format(), now.subtract(7, 'd').format()];
        }
        case DateIntervals.LAST_MONTH: {
            return [now.format(), now.subtract(30, 'd').format()];
        }
        case DateIntervals.LAST_QUARTER: {
            return [now.format(), now.subtract(90, 'd').format()];
        }
        case DateIntervals.LAST_YEAR: {
            return [now.format(), now.subtract(365, 'd').format()];
        }
        default: {
            throw Error(`Date interval is not supported: ${interval}`);
        }
    }
}

function AnalyticsPage(): JSX.Element {
    const location = useLocation();

    const requestedInstanceType: string = (() => {
        if (location.pathname.includes('projects')) {
            return 'project';
        } if (location.pathname.includes('jobs')) {
            return 'job';
        }
        return 'task';
    })();

    const requestedInstanceID: number = (() => {
        switch (requestedInstanceType) {
            case 'project': {
                return +useParams<{ pid: string }>().pid;
            }
            case 'task': {
                return +useParams<{ tid: string }>().tid;
            }
            case 'job': {
                return +useParams<{ jid: string }>().jid;
            }
            default: {
                throw new Error(`Unsupported instance type ${requestedInstanceType}`);
            }
        }
    })();

    /*
    Note that the loaded instance can be different from the page location instance.
    It happens on page change within the same component,
    e.g. moving from project quality report to task report
    */
    const [instanceType, setInstanceType] = useState<string | null>(null);
    const [instance, setInstance] = useState<Project | Task | Job | null>(null);
    const [fetching, setFetching] = useState(true);
    const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReport | null>(null);
    const isMounted = useIsMounted();

    const receiveInstance = (_instanceType: string, _instanceID: number): void => {
        let instanceRequest = null;
        switch (_instanceType) {
            case 'project': {
                instanceRequest = core.projects.get({ id: _instanceID });
                break;
            }
            case 'task': {
                instanceRequest = core.tasks.get({ id: _instanceID });
                break;
            }
            case 'job':
            {
                instanceRequest = core.jobs.get({ jobID: _instanceID });
                break;
            }
            default: {
                throw new Error(`Unsupported instance type ${_instanceType}`);
            }
        }

        if (_instanceID) {
            instanceRequest
                .then(([_instance]: Task[] | Project[] | Job[]) => {
                    if (isMounted() && _instance) {
                        setInstance(_instance);
                        setInstanceType(_instanceType);
                    }
                }).catch((error: Error) => {
                    if (isMounted()) {
                        notification.error({
                            message: 'Could not receive the requested instance from the server',
                            description: error.toString(),
                        });
                    }
                }).finally(() => {
                    if (isMounted()) {
                        setFetching(false);
                    }
                });
        } else {
            notification.error({
                message: 'Could not receive the requested task from the server',
                description: `Requested "${_instanceID}" is not valid`,
            });
            setFetching(false);
        }
    };

    const receiveReport = (
        timeInterval: DateIntervals, _instanceType: string, _instanceID: number,
    ): void => {
        if (_instanceID) {
            let reportRequest = null;
            const [endDate, startDate] = handleTimePeriod(timeInterval);

            switch (_instanceType) {
                case 'project': {
                    reportRequest = core.analytics.performance.reports({
                        projectID: _instanceID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                case 'task': {
                    reportRequest = core.analytics.performance.reports({
                        taskID: _instanceID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                case 'job': {
                    reportRequest = core.analytics.performance.reports({
                        jobID: _instanceID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                default: {
                    throw new Error(`Unsupported instance type ${_instanceType}`);
                }
            }

            reportRequest
                .then((report: AnalyticsReport) => {
                    if (isMounted() && report) {
                        setAnalyticsReport(report);
                    }
                }).catch((error: Error) => {
                    if (isMounted()) {
                        notification.error({
                            message: 'Could not receive the requested report from the server',
                            description: error.toString(),
                        });
                    }
                });
        }
    };

    useEffect((): void => {
        setFetching(true);

        Promise.all([
            receiveInstance(requestedInstanceType, requestedInstanceID),
            receiveReport(DateIntervals.LAST_WEEK, requestedInstanceType, requestedInstanceID),
        ]).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, [requestedInstanceType, requestedInstanceID]);

    const onJobUpdate = useCallback((job: Job): void => {
        setFetching(true);

        job.save().then(() => {
            if (isMounted() && instanceType && instance?.id) {
                receiveInstance(instanceType, instance?.id);
            }
        }).catch((error: Error) => {
            if (isMounted()) {
                notification.error({
                    message: 'Could not update the job',
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, [instanceType, instance?.id]);

    const onAnalyticsTimePeriodChange = useCallback((val: DateIntervals): void => {
        if (isMounted() && instanceType && instance?.id) {
            receiveReport(val, instanceType, instance?.id);
        }
    }, [instanceType, instance?.id]);

    let backNavigation: JSX.Element | null = null;
    let title: JSX.Element | null = null;
    let tabs: JSX.Element | null = null;
    if (instanceType && instance) {
        switch (instanceType) {
            case 'project': {
                backNavigation = (
                    <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                        <GoBackButton />
                    </Col>
                );
                title = (
                    <Col className='cvat-project-analytics-title'>
                        <Title level={4} className='cvat-text-color'>
                            Analytics for
                            {' '}
                            <Link to={`/projects/${instance.id}`}>{`Project #${instance.id}`}</Link>
                        </Title>
                    </Col>
                );
                tabs = (
                    <Tabs type='card'>
                        <Tabs.TabPane
                            tab={(
                                <span>
                                    <Text>Performance</Text>
                                </span>
                            )}
                            key='Overview'
                        >
                            <AnalyticsOverview
                                report={analyticsReport}
                                onTimePeriodChange={onAnalyticsTimePeriodChange}
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane
                            tab={(
                                <span>
                                    <Text>Quality</Text>
                                </span>
                            )}
                            key='quality'
                        >
                            <ProjectQualityComponent project={instance} />
                        </Tabs.TabPane>
                    </Tabs>
                );
                break;
            }
            case 'task': {
                backNavigation = (
                    <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                        <GoBackButton />
                    </Col>
                );
                title = (
                    <Col className='cvat-task-analytics-title'>
                        <Title level={4} className='cvat-text-color'>
                            Analytics for
                            {' '}
                            <Link to={`/tasks/${instance.id}`}>{`Task #${instance.id}`}</Link>
                        </Title>
                    </Col>
                );
                tabs = (
                    <Tabs type='card'>
                        <Tabs.TabPane
                            tab={(
                                <span>
                                    <Text>Performance</Text>
                                </span>
                            )}
                            key='overview'
                        >
                            <AnalyticsOverview
                                report={analyticsReport}
                                onTimePeriodChange={onAnalyticsTimePeriodChange}
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane
                            tab={(
                                <span>
                                    <Text>Quality</Text>
                                </span>
                            )}
                            key='quality'
                        >
                            <TaskQualityComponent task={instance} onJobUpdate={onJobUpdate} />
                        </Tabs.TabPane>
                    </Tabs>
                );
                break;
            }
            case 'job':
            {
                backNavigation = (
                    <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                        <GoBackButton />
                    </Col>
                );
                title = (
                    <Col className='cvat-job-analytics-title'>
                        <Title level={4} className='cvat-text-color'>
                            Analytics for
                            {' '}
                            <Link to={`/tasks/${instance.taskId}/jobs/${instance.id}`}>{`Job #${instance.id}`}</Link>
                        </Title>
                    </Col>
                );
                tabs = (
                    <Tabs type='card'>
                        <Tabs.TabPane
                            tab={(
                                <span>
                                    <Text>Performance</Text>
                                </span>
                            )}
                            key='overview'
                        >
                            <AnalyticsOverview
                                report={analyticsReport}
                                onTimePeriodChange={onAnalyticsTimePeriodChange}
                            />
                        </Tabs.TabPane>
                    </Tabs>
                );
                break;
            }
            default: {
                throw new Error(`Unsupported instance type ${requestedInstanceType}`);
            }
        }
    }

    return (
        <div className='cvat-analytics-page'>
            {
                fetching ? (
                    <div className='cvat-analytics-loading'>
                        <CVATLoadingSpinner />
                    </div>
                ) : (
                    <Row
                        justify='center'
                        align='top'
                        className='cvat-analytics-wrapper'
                    >
                        {backNavigation}
                        <Col span={22} xl={18} xxl={14} className='cvat-analytics-inner'>
                            {title}
                            {tabs}
                        </Col>
                    </Row>
                )
            }
        </div>
    );
}

export default React.memo(AnalyticsPage);
