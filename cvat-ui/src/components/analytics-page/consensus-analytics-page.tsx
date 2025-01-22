// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Title from 'antd/lib/typography/Title';
import notification from 'antd/lib/notification';
import { useIsMounted } from 'utils/hooks';
import { CombinedState, Task } from 'reducers';
import { getCore } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import { consensusActions } from 'actions/consensus-actions';
import ConsensusSettingsForm from './task-consensus/consensus-settings-form';
import TaskConsensusAnalyticsComponent from './task-consensus/task-consensus-component';

const core = getCore();

enum ConsensusAnalyticsTabs {
    OVERVIEW = 'overview',
    SETTINGS = 'settings',
}

function getTabFromHash(): ConsensusAnalyticsTabs {
    const tab = window.location.hash.slice(1) as ConsensusAnalyticsTabs;
    return Object.values(ConsensusAnalyticsTabs).includes(tab) ? tab : ConsensusAnalyticsTabs.OVERVIEW;
}

type InstanceType = 'task';

function TaskConsensusAnalyticsPage(): JSX.Element {
    const dispatch = useDispatch();

    const requestedInstanceType: InstanceType = 'task';
    const requestedInstanceID = +useParams<{ tid: string }>().tid;

    const [activeTab, setTab] = useState(getTabFromHash());
    const [instanceType, setInstanceType] = useState<InstanceType | null>(null);
    const [instance, setInstance] = useState<Task | null>(null);
    const [fetching, setFetching] = useState(true);
    const isMounted = useIsMounted();
    const consensusSettings = useSelector((state: CombinedState) => state.consensus?.consensusSettings);

    const onTabKeyChange = useCallback((key: string): void => {
        setTab(key as ConsensusAnalyticsTabs);
    }, []);

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

    function handleError(error: Error): void {
        notification.error({
            description: error.toString(),
            message: 'Could not fetch consensus settings.',
        });
    }

    useEffect(() => {
        window.addEventListener('hashchange', () => {
            const hash = getTabFromHash();
            setTab(hash);
        });
    }, []);

    useEffect(() => {
        if (instance) {
            dispatch(consensusActions.setFetching(true));

            const settingsRequest = core.consensus.settings.get({ taskID: instance.id });

            Promise.all([settingsRequest])
                .then(([settings]) => {
                    dispatch(consensusActions.setConsensusSettings(settings));
                })
                .catch(handleError)
                .finally(() => {
                    dispatch(consensusActions.setFetching(false));
                });
        }
    }, [instance?.id]);

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

        const analyticsFor = <Link to={`/tasks/${instance.id}`}>{`Task #${instance.id}`}</Link>;
        title = (
            <Col>
                <Title level={4} className='cvat-text-color'>
                    Consensus Analytics for
                    {' '}
                    {analyticsFor}
                </Title>
            </Col>
        );

        const consensusSettingsForm = (
            <ConsensusSettingsForm
                settings={consensusSettings}
                setConsensusSettings={(settings) => dispatch(consensusActions.setConsensusSettings(settings))}
            />
        );

        tabs = (
            <Tabs
                type='card'
                activeKey={activeTab}
                defaultActiveKey={ConsensusAnalyticsTabs.OVERVIEW}
                onChange={onTabKeyChange}
                className='cvat-task-analytics-tabs'
                items={[
                    ...(
                        [
                            {
                                key: ConsensusAnalyticsTabs.OVERVIEW,
                                label: 'Overview',
                                children: (
                                    <TaskConsensusAnalyticsComponent task={instance} />
                                ),
                            },
                        ]),
                    ...(instance.consensusJobsPerRegularJob ?
                        [
                            {
                                key: ConsensusAnalyticsTabs.SETTINGS,
                                label: 'Settings',
                                children: (
                                    consensusSettingsForm
                                ),
                            },
                        ] :
                        []),
                ]}
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

export default React.memo(TaskConsensusAnalyticsPage);
