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
import TaskQualityComponent from './quality/task-quality-component';

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
    let instanceType = '';
    if (location.pathname.includes('projects')) {
        instanceType = 'project';
    } else if (location.pathname.includes('jobs')) {
        instanceType = 'job';
    } else {
        instanceType = 'task';
    }

    const [fetching, setFetching] = useState(true);
    const [instance, setInstance] = useState<Project | Task | Job | null>(null);
    const [analyticsReportInstance, setAnalyticsReportInstance] = useState<AnalyticsReport | null>(null);
    const isMounted = useIsMounted();

    let instanceID: number | null = null;
    let reportRequestID: number | null = null;
    switch (instanceType) {
        case 'project': {
            instanceID = +useParams<{ pid: string }>().pid;
            reportRequestID = +useParams<{ pid: string }>().pid;
            break;
        }
        case 'task': {
            instanceID = +useParams<{ tid: string }>().tid;
            reportRequestID = +useParams<{ tid: string }>().tid;
            break;
        }
        case 'job': {
            instanceID = +useParams<{ jid: string }>().jid;
            reportRequestID = +useParams<{ jid: string }>().jid;
            break;
        }
        default: {
            throw new Error(`Unsupported instance type ${instanceType}`);
        }
    }

    const receieveInstance = (): void => {
        let instanceRequest = null;
        switch (instanceType) {
            case 'project': {
                instanceRequest = core.projects.get({ id: instanceID });
                break;
            }
            case 'task': {
                instanceRequest = core.tasks.get({ id: instanceID });
                break;
            }
            case 'job':
            {
                instanceRequest = core.jobs.get({ jobID: instanceID });
                break;
            }
            default: {
                throw new Error(`Unsupported instance type ${instanceType}`);
            }
        }

        if (Number.isInteger(instanceID)) {
            instanceRequest
                .then(([_instance]: Task[] | Project[] | Job[]) => {
                    if (isMounted() && _instance) {
                        setInstance(_instance);
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
                description: `Requested "${instanceID}" is not valid`,
            });
            setFetching(false);
        }
    };

    const receieveReport = (timeInterval: DateIntervals): void => {
        if (Number.isInteger(instanceID) && Number.isInteger(reportRequestID)) {
            let reportRequest = null;
            const [endDate, startDate] = handleTimePeriod(timeInterval);

            switch (instanceType) {
                case 'project': {
                    reportRequest = core.analytics.performance.reports({
                        projectID: reportRequestID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                case 'task': {
                    reportRequest = core.analytics.performance.reports({
                        taskID: reportRequestID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                case 'job': {
                    reportRequest = core.analytics.performance.reports({
                        jobID: reportRequestID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                default: {
                    throw new Error(`Unsupported instance type ${instanceType}`);
                }
            }

            reportRequest
                .then((report: AnalyticsReport) => {
                    if (isMounted() && report) {
                        setAnalyticsReportInstance(report);
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
        Promise.all([receieveInstance(), receieveReport(DateIntervals.LAST_WEEK)]).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, []);

    const onJobUpdate = useCallback((job: Job): void => {
        setFetching(true);
        job.save().then(() => {
            if (isMounted()) {
                receieveInstance();
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
    }, []);

    const onAnalyticsTimePeriodChange = useCallback((val: DateIntervals): void => {
        receieveReport(val);
    }, []);

    let backNavigation: JSX.Element | null = null;
    let title: JSX.Element | null = null;
    let tabs: JSX.Element | null = null;
    if (instance) {
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
                    <Tabs type='card' className='cvat-project-analytics-tabs'>
                        <Tabs.TabPane
                            tab={(
                                <span>
                                    <Text>Performance</Text>
                                </span>
                            )}
                            key='Overview'
                        >
                            <AnalyticsOverview
                                report={analyticsReportInstance}
                                onTimePeriodChange={onAnalyticsTimePeriodChange}
                            />
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
                    <Tabs type='card' className='cvat-task-analytics-tabs'>
                        <Tabs.TabPane
                            tab={(
                                <span>
                                    <Text>Performance</Text>
                                </span>
                            )}
                            key='overview'
                        >
                            <AnalyticsOverview
                                report={analyticsReportInstance}
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
                                report={analyticsReportInstance}
                                onTimePeriodChange={onAnalyticsTimePeriodChange}
                            />
                        </Tabs.TabPane>
                    </Tabs>
                );
                break;
            }
            default: {
                throw new Error(`Unsupported instance type ${instanceType}`);
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
