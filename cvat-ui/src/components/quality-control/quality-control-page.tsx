// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Title from 'antd/lib/typography/Title';
import notification from 'antd/lib/notification';
import { useIsMounted } from 'utils/hooks';
import {
    Job, Task, getCore,
} from 'cvat-core-wrapper';
import { updateJobAsync } from 'actions/jobs-actions';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import TaskQualityComponent from './task-quality/task-quality-component';

const core = getCore();

enum QualityControlTabs {
    OVERVIEW = 'overview',
    SETTINGS = 'settings',
}

function getTabFromHash(): QualityControlTabs {
    const tab = window.location.hash.slice(1) as QualityControlTabs;
    return Object.values(QualityControlTabs).includes(tab) ? tab : QualityControlTabs.OVERVIEW;
}

function readInstanceType(): InstanceType {
    return 'task';
}

function readInstanceId(): number {
    return +useParams<{ tid: string }>().tid;
}

type InstanceType = 'project' | 'task' | 'job';

function QualityControlPage(): JSX.Element {
    const dispatch = useDispatch();

    const requestedInstanceType: InstanceType = readInstanceType();
    const requestedInstanceID = readInstanceId();

    const [activeTab, setTab] = useState(getTabFromHash());
    const [instanceType, setInstanceType] = useState<InstanceType | null>(null);
    const [instance, setInstance] = useState<Task | null>(null);
    const [fetching, setFetching] = useState(true);
    const isMounted = useIsMounted();

    const receiveInstance = async (type: InstanceType, id: number): Promise<void> => {
        let receivedInstance: Task | null = null;

        try {
            switch (type) {
                case 'task': {
                    [receivedInstance] = await core.tasks.get({ id });
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

    useEffect(() => {
        if (Number.isInteger(requestedInstanceID) && ['project', 'task', 'job'].includes(requestedInstanceType)) {
            setFetching(true);
            Promise.all([
                receiveInstance(requestedInstanceType, requestedInstanceID),
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
            }
        };
    }, [requestedInstanceType, requestedInstanceID]);

    useEffect(() => {
        window.addEventListener('hashchange', () => {
            const hash = getTabFromHash();
            setTab(hash);
        });
    }, []);

    useEffect(() => {
        window.location.hash = activeTab;
    }, [activeTab]);

    const onJobUpdate = useCallback((job: Job, data: Parameters<Job['save']>[0]): void => {
        setFetching(true);
        dispatch(updateJobAsync(job, data)).finally(() => {
            if (isMounted()) {
                setFetching(false);
            }
        });
    }, []);

    const onTabKeyChange = useCallback((key: string): void => {
        setTab(key as QualityControlTabs);
    }, []);

    let backNavigation: JSX.Element | null = null;
    let title: JSX.Element | null = null;
    let tabs: JSX.Element | null = null;
    if (instanceType && instance) {
        backNavigation = (
            <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                <GoBackButton />
            </Col>
        );

        const qualityControlFor = <Link to={`/tasks/${instance.id}`}>{`Task #${instance.id}`}</Link>;
        title = (
            <Col>
                <Title level={4} className='cvat-text-color'>
                    Quality control for
                    {' '}
                    {qualityControlFor}
                </Title>
            </Col>
        );

        tabs = (
            <Tabs
                type='card'
                activeKey={activeTab}
                defaultActiveKey={QualityControlTabs.OVERVIEW}
                onChange={onTabKeyChange}
                className='cvat-task-analytics-tabs'
                items={[{
                    key: QualityControlTabs.OVERVIEW,
                    label: 'Performance',
                    children: (
                        <TaskQualityComponent task={instance} onJobUpdate={onJobUpdate} />
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

export default React.memo(QualityControlPage);
