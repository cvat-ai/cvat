// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
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

const core = getCore();

enum AnalyticsTabs {
    OVERVIEW = 'overview',
    QUALITY = 'quality',
}

function getTabFromHash(): AnalyticsTabs {
    const tab = window.location.hash.slice(1) as AnalyticsTabs;
    return Object.values(AnalyticsTabs).includes(tab) ? tab : AnalyticsTabs.OVERVIEW;
}

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

type InstanceType = 'project' | 'task' | 'job';

function AnalyticsPage(): JSX.Element {
    const location = useLocation();

    const requestedInstanceType: InstanceType = (() => {
        if (location.pathname.includes('projects')) {
            return 'project';
        }
        if (location.pathname.includes('jobs')) {
            return 'job';
        }
        return 'task';
    })();

    const requestedInstanceID: number = (() => {
        if (requestedInstanceType === 'project') {
            return +useParams<{ pid: string }>().pid;
        }
        if (requestedInstanceType === 'job') {
            return +useParams<{ jid: string }>().jid;
        }
        return +useParams<{ tid: string }>().tid;
    })();

    const [activeTab, setTab] = useState(getTabFromHash());

    const [instanceType, setInstanceType] = useState<InstanceType | null>(null);
    const [instance, setInstance] = useState<Project | Task | Job | null>(null);
    const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReport | null>(null);
    const [timePeriod, setTimePeriod] = useState<DateIntervals>(DateIntervals.LAST_WEEK);
    const [fetching, setFetching] = useState(true);
    const isMounted = useIsMounted();

    const receiveInstance = (type: InstanceType, id: number): Promise<Task[] | Job[] | Project[]> => {
        if (type === 'project') {
            return core.projects.get({ id });
        }

        if (type === 'task') {
            return core.tasks.get({ id });
        }

        return core.jobs.get({ jobID: id });
    };

    const receiveReport = (timeInterval: DateIntervals, type: InstanceType, id: number): Promise<AnalyticsReport> => {
        const [endDate, startDate] = handleTimePeriod(timeInterval);
        if (type === 'project') {
            return core.analytics.performance.reports({
                projectID: id,
                endDate,
                startDate,
            });
        }

        if (type === 'task') {
            return core.analytics.performance.reports({
                taskID: id,
                endDate,
                startDate,
            });
        }

        return core.analytics.performance.reports({
            jobID: id,
            endDate,
            startDate,
        });
    };

    useEffect(() => {
        setFetching(true);

        if (Number.isInteger(requestedInstanceID) && ['project', 'task', 'job'].includes(requestedInstanceType)) {
            Promise.all([
                receiveInstance(requestedInstanceType, requestedInstanceID),
                receiveReport(timePeriod, requestedInstanceType, requestedInstanceID),
            ])
                .then(([instanceResponse, report]) => {
                    const receivedInstance: Task | Project | Job = instanceResponse[0];
                    if (receivedInstance && isMounted()) {
                        setInstance(receivedInstance);
                        setInstanceType(requestedInstanceType);
                    }
                    if (report && isMounted()) {
                        setAnalyticsReport(report);
                    }
                })
                .catch((error: Error) => {
                    notification.error({
                        message: 'Could not receive requested resources',
                        description: `${error.toString()}`,
                    });
                })
                .finally(() => {
                    if (isMounted()) {
                        setFetching(false);
                    }
                });
        } else {
            notification.error({
                message: 'Could not load this page',
                description: `Not valid resource ${requestedInstanceType} #${requestedInstanceID}`,
            });
        }

        return () => {
            if (isMounted()) {
                setInstance(null);
                setAnalyticsReport(null);
            }
        };
    }, [requestedInstanceType, requestedInstanceID, timePeriod]);

    const onJobUpdate = useCallback((job: Job): void => {
        setFetching(true);

        job.save()
            .catch((error: Error) => {
                notification.error({
                    message: 'Could not update the job',
                    description: error.toString(),
                });
            })
            .finally(() => {
                if (isMounted()) {
                    setFetching(false);
                }
            });
    }, []);

    useEffect(() => {
        window.addEventListener('hashchange', () => {
            const hash = getTabFromHash();
            setTab(hash);
        });
    }, []);

    const onTabKeyChange = (key: string): void => {
        setTab(key as AnalyticsTabs);
    };

    useEffect(() => {
        window.location.hash = activeTab;
    }, [activeTab]);

    let backNavigation: JSX.Element | null = null;
    let title: JSX.Element | null = null;
    let tabs: JSX.Element | null = null;
    if (instanceType && instance) {
        backNavigation = (
            <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                <GoBackButton />
            </Col>
        );

        let analyticsFor: JSX.Element | null = <Link to={`/projects/${instance.id}`}>{`Project #${instance.id}`}</Link>;
        if (instanceType === 'task') {
            analyticsFor = <Link to={`/tasks/${instance.id}`}>{`Task #${instance.id}`}</Link>;
        } else if (instanceType === 'job') {
            analyticsFor = <Link to={`/tasks/${instance.taskId}/jobs/${instance.id}`}>{`Job #${instance.id}`}</Link>;
        }
        title = (
            <Col>
                <Title level={4} className='cvat-text-color'>
                    Analytics for
                    {' '}
                    {analyticsFor}
                </Title>
            </Col>
        );

        tabs = (
            <Tabs
                type='card'
                activeKey={activeTab}
                defaultActiveKey={AnalyticsTabs.OVERVIEW}
                onChange={onTabKeyChange}
                className='cvat-task-analytics-tabs'
            >
                <Tabs.TabPane tab='Performance' key={AnalyticsTabs.OVERVIEW}>
                    <AnalyticsOverview
                        report={analyticsReport}
                        timePeriod={timePeriod}
                        onTimePeriodChange={setTimePeriod}
                    />
                </Tabs.TabPane>
                {instanceType === 'task' && (
                    <Tabs.TabPane tab='Quality' key={AnalyticsTabs.QUALITY}>
                        <TaskQualityComponent task={instance} onJobUpdate={onJobUpdate} />
                    </Tabs.TabPane>
                )}
            </Tabs>
        );
    }

    return (
        <div className='cvat-analytics-page'>
            {fetching ? (
                <div className='cvat-analytics-loading'>
                    <CVATLoadingSpinner />
                </div>
            ) : (
                <Row justify='center' align='top' className='cvat-analytics-wrapper'>
                    {backNavigation}
                    <Col span={22} xl={18} xxl={14} className='cvat-analytics-inner'>
                        {title}
                        {tabs}
                    </Col>
                </Row>
            )}
        </div>
    );
}

export default React.memo(AnalyticsPage);
