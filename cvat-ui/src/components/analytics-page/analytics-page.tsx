// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Spin from 'antd/lib/spin';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { LeftOutlined } from '@ant-design/icons/lib/icons';
import { useIsMounted } from 'utils/hooks';
import { Project, Task } from 'reducers';
import { AnalyticsReport, Job, getCore } from 'cvat-core-wrapper';
import moment from 'moment';
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
    const [instance, setInstance] = useState<Project | Task | null>(null);
    const [analyticsReportInstance, setAnalyticsReportInstance] = useState<AnalyticsReport | null>(null);
    const isMounted = useIsMounted();

    const history = useHistory();

    let instanceID: number | null = null;
    let reportRequestID: number | null = null;
    switch (instanceType) {
        case 'project':
        case 'task':
        {
            instanceID = +useParams<{ id: string }>().id;
            reportRequestID = +useParams<{ id: string }>().id;
            break;
        }
        case 'job': {
            instanceID = +useParams<{ tid: string }>().tid;
            reportRequestID = +useParams<{ jid: string }>().jid;
            break;
        }
        default: {
            throw Error(`Unsupported instance type ${instanceType}`);
        }
    }

    const receieveInstance = (): void => {
        let instanceRequest = null;
        switch (instanceType) {
            case 'project': {
                instanceRequest = core.projects.get({ id: instanceID });
                break;
            }
            case 'task':
            case 'job':
            {
                instanceRequest = core.tasks.get({ id: instanceID });
                break;
            }
            default: {
                throw Error(`Unsupported instance type ${instanceType}`);
            }
        }

        if (Number.isInteger(instanceID)) {
            instanceRequest
                .then(([_instance]: Task[] | Project[]) => {
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
                    reportRequest = core.analytics.common.reports({
                        projectID: reportRequestID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                case 'task': {
                    reportRequest = core.analytics.common.reports({
                        taskID: reportRequestID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                case 'job': {
                    reportRequest = core.analytics.common.reports({
                        jobID: reportRequestID,
                        endDate,
                        startDate,
                    });
                    break;
                }
                default: {
                    throw Error(`Unsupported instance type ${instanceType}`);
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
        receieveInstance();
        receieveReport(DateIntervals.LAST_WEEK);
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
    }, [notification]);

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
                        <Button
                            className='cvat-back-to-project-button'
                            onClick={() => history.push(`/projects/${instance.id}`)}
                            type='link'
                            size='large'
                        >
                            <LeftOutlined />
                            Back to project
                        </Button>
                    </Col>
                );
                title = (
                    <Col className='cvat-project-analytics-title'>
                        <Title
                            level={4}
                            className='cvat-text-color'
                        >
                            {instance.name}
                        </Title>
                        <Text
                            type='secondary'
                        >
                            {`#${instance.id}`}
                        </Text>
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
                        <Button
                            className='cvat-back-to-task-button'
                            onClick={() => history.push(`/tasks/${instance.id}`)}
                            type='link'
                            size='large'
                        >
                            <LeftOutlined />
                            Back to task
                        </Button>
                    </Col>
                );
                title = (
                    <Col className='cvat-task-analytics-title'>
                        <Title
                            level={4}
                            className='cvat-text-color'
                        >
                            {instance.name}
                        </Title>
                        <Text
                            type='secondary'
                        >
                            {`#${instance.id}`}
                        </Text>
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
                        <Button
                            className='cvat-back-to-task-button'
                            onClick={() => history.push(`/tasks/${instance.id}`)}
                            type='link'
                            size='large'
                        >
                            <LeftOutlined />
                            Back to task
                        </Button>
                    </Col>
                );
                title = (
                    <Col className='cvat-task-analytics-title'>
                        <Title
                            level={4}
                            className='cvat-text-color'
                        >
                            Job
                            {' '}
                            {`#${instance.id}`}
                            {' '}
                            of
                            {' '}
                            {instance.name}
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
                throw Error(`Unsupported instance type ${instanceType}`);
            }
        }
    }

    return (
        <div className='cvat-analytics-page'>
            {
                fetching ? (
                    <div className='cvat-analytics-loading'>
                        <Spin size='large' className='cvat-spinner' />
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
