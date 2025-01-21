// Copyright (C) CVAT.ai Corporation
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
import moment from 'moment';
import { useIsMounted } from 'utils/hooks';
import {
    AnalyticsReport, Job, Project, RQStatus, Task, getCore,
} from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import AnalyticsOverview, { DateIntervals } from './analytics-performance';

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

function readInstanceType(location: ReturnType<typeof useLocation>): InstanceType {
    if (location.pathname.includes('projects')) {
        return 'project';
    }
    if (location.pathname.includes('jobs')) {
        return 'job';
    }
    return 'task';
}

function readInstanceId(type: InstanceType): number {
    if (type === 'project') {
        return +useParams<{ pid: string }>().pid;
    }
    if (type === 'job') {
        return +useParams<{ jid: string }>().jid;
    }
    return +useParams<{ tid: string }>().tid;
}

type InstanceType = 'project' | 'task' | 'job';

function AnalyticsPage(): JSX.Element {
    const location = useLocation();

    const requestedInstanceType: InstanceType = readInstanceType(location);
    const requestedInstanceID = readInstanceId(requestedInstanceType);

    const [activeTab, setTab] = useState(getTabFromHash());
    const [instanceType, setInstanceType] = useState<InstanceType | null>(null);
    const [instance, setInstance] = useState<Project | Task | Job | null>(null);
    const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReport | null>(null);
    const [timePeriod, setTimePeriod] = useState<DateIntervals>(DateIntervals.LAST_WEEK);
    const [reportRefreshingStatus, setReportRefreshingStatus] = useState<string | null>(null);
    const [fetching, setFetching] = useState(true);
    const isMounted = useIsMounted();

    const receiveInstance = async (type: InstanceType, id: number): Promise<void> => {
        let receivedInstance: Task | Project | Job | null = null;

        try {
            switch (type) {
                case 'project': {
                    [receivedInstance] = await core.projects.get({ id });
                    break;
                }
                case 'task': {
                    [receivedInstance] = await core.tasks.get({ id });
                    break;
                }
                case 'job': {
                    [receivedInstance] = await core.jobs.get({ jobID: id });
                    break;
                }
                default:
                    return;
            }

            if (isMounted()) {
                setInstance(receivedInstance);
                setInstanceType(type);
            }
        } catch (error: unknown) {
            notification.error({
                message: `Could not receive requested ${type}`,
                description: `${error instanceof Error ? error.message : ''}`,
            });
        }
    };

    const receiveReport = async (timeInterval: DateIntervals, type: InstanceType, id: number): Promise<void> => {
        const [endDate, startDate] = handleTimePeriod(timeInterval);
        let report: AnalyticsReport | null = null;

        try {
            const body = { endDate, startDate };
            switch (type) {
                case 'project': {
                    report = await core.analytics.performance.reports({ ...body, projectID: id });
                    break;
                }
                case 'task': {
                    report = await core.analytics.performance.reports({ ...body, taskID: id });
                    break;
                }
                case 'job': {
                    report = await core.analytics.performance.reports({ ...body, jobID: id });
                    break;
                }
                default:
                    return;
            }

            if (isMounted()) {
                setAnalyticsReport(report);
            }
        } catch (error: unknown) {
            notification.error({
                message: 'Could not receive requested report',
                description: `${error instanceof Error ? error.message : ''}`,
            });
        }
    };

    useEffect(() => {
        if (Number.isInteger(requestedInstanceID) && ['project', 'task', 'job'].includes(requestedInstanceType)) {
            setFetching(true);
            Promise.all([
                receiveInstance(requestedInstanceType, requestedInstanceID),
                receiveReport(timePeriod, requestedInstanceType, requestedInstanceID),
            ]).finally(() => {
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

    useEffect(() => {
        window.addEventListener('hashchange', () => {
            const hash = getTabFromHash();
            setTab(hash);
        });
    }, []);

    useEffect(() => {
        window.location.hash = activeTab;
    }, [activeTab]);

    const onCreateReport = useCallback(() => {
        const onUpdate = (status: RQStatus, progress: number, message: string): void => {
            setReportRefreshingStatus(message);
        };

        const body = {
            ...(requestedInstanceType === 'project' ? { projectID: requestedInstanceID } : {}),
            ...(requestedInstanceType === 'task' ? { taskID: requestedInstanceID } : {}),
            ...(requestedInstanceType === 'job' ? { jobID: requestedInstanceID } : {}),
        };

        core.analytics.performance.calculate(body, onUpdate).then(() => {
            receiveReport(timePeriod, requestedInstanceType, requestedInstanceID);
        }).finally(() => {
            setReportRefreshingStatus(null);
        }).catch((error: unknown) => {
            if (isMounted()) {
                notification.error({
                    message: 'Error occurred during requesting performance report',
                    description: error instanceof Error ? error.message : '',
                });
            }
        });
    }, [requestedInstanceType, requestedInstanceID, timePeriod]);

    const onTabKeyChange = useCallback((key: string): void => {
        setTab(key as AnalyticsTabs);
    }, []);

    let backNavigation: JSX.Element | null = null;
    let title: JSX.Element | null = null;
    let tabs: JSX.Element | null = null;
    if (instanceType && instance) {
        backNavigation = (
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                    <GoBackButton />
                </Col>
            </Row>
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
                items={[{
                    key: AnalyticsTabs.OVERVIEW,
                    label: 'Performance',
                    children: (
                        <AnalyticsOverview
                            report={analyticsReport}
                            timePeriod={timePeriod}
                            reportRefreshingStatus={reportRefreshingStatus}
                            onTimePeriodChange={setTimePeriod}
                            onCreateReport={onCreateReport}
                        />
                    ),
                }]}
            />
        );
    }

    return (
        <div className='cvat-analytics-page'>
            {fetching ? (
                <div className='cvat-analytics-loading'>
                    <CVATLoadingSpinner />
                </div>
            ) : (
                <Row className='cvat-analytics-wrapper'>
                    <Col span={24}>
                        {backNavigation}
                        <Row justify='center'>
                            <Col span={22} xl={18} xxl={14} className='cvat-analytics-inner'>
                                {title}
                                {tabs}
                            </Col>
                        </Row>
                    </Col>
                </Row>
            )}
        </div>
    );
}

export default React.memo(AnalyticsPage);
