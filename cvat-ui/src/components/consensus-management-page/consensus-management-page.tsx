// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, {
    useCallback, useEffect, useState, useReducer,
} from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import notification from 'antd/lib/notification';
import { ConsensusSettings, Task, getCore } from 'cvat-core-wrapper';
import GoBackButton from 'components/common/go-back-button';

import Tabs, { TabsProps } from 'antd/lib/tabs';
import Result from 'antd/lib/result';

import CVATLoadingSpinner from 'components/common/loading-spinner';
import ResourceLink from 'components/common/resource-link';
import { ActionUnion, createAction } from 'utils/redux';
import { fetchTask } from 'utils/fetch';
import { getTabFromHash } from 'utils/location-utils';
import ConsensusSettingsTab from './consensus-settings-tab';

const core = getCore();

enum TabName {
    settings = 'settings',
}

const DEFAULT_TAB = TabName.settings;

interface State {
    fetching: boolean;
    reportRefreshingStatus: string | null;
    error: Error | null;
    consensusSettings: {
        settings: ConsensusSettings | null;
        fetching: boolean;
    };
}

enum ReducerActionType {
    SET_FETCHING = 'SET_FETCHING',
    SET_CONSENSUS_SETTINGS = 'SET_CONSENSUS_SETTINGS',
    SET_CONSENSUS_SETTINGS_FETCHING = 'SET_CONSENSUS_SETTINGS_FETCHING',
    SET_REPORT_REFRESHING_STATUS = 'SET_REPORT_REFRESHING_STATUS',
    SET_ERROR = 'SET_ERROR',
}

export const reducerActions = {
    setFetching: (fetching: boolean) => (
        createAction(ReducerActionType.SET_FETCHING, { fetching })
    ),
    setConsensusSettings: (consensusSettings: ConsensusSettings) => (
        createAction(ReducerActionType.SET_CONSENSUS_SETTINGS, { consensusSettings })
    ),
    setConsensusSettingsFetching: (fetching: boolean) => (
        createAction(ReducerActionType.SET_CONSENSUS_SETTINGS_FETCHING, { fetching })
    ),
    setError: (error: Error) => (
        createAction(ReducerActionType.SET_ERROR, { error })
    ),
};

const reducer = (state: State, action: ActionUnion<typeof reducerActions>): State => {
    if (action.type === ReducerActionType.SET_FETCHING) {
        return {
            ...state,
            fetching: action.payload.fetching,
        };
    }

    if (action.type === ReducerActionType.SET_CONSENSUS_SETTINGS) {
        return {
            ...state,
            consensusSettings: {
                ...state.consensusSettings,
                settings: action.payload.consensusSettings,
            },
        };
    }

    if (action.type === ReducerActionType.SET_CONSENSUS_SETTINGS_FETCHING) {
        return {
            ...state,
            consensusSettings: {
                ...state.consensusSettings,
                fetching: action.payload.fetching,
            },
        };
    }

    if (action.type === ReducerActionType.SET_ERROR) {
        return {
            ...state,
            error: action.payload.error,
        };
    }

    return state;
};

const supportedTabs = Object.values(TabName);
function ConsensusManagementPage(): JSX.Element {
    const [state, dispatch] = useReducer(reducer, {
        fetching: true,
        reportRefreshingStatus: null,
        error: null,
        consensusSettings: {
            settings: null,
            fetching: false,
        },
    });

    const requestedInstanceID = +useParams<{ tid: string }>().tid;

    const [activeTab, setActiveTab] = useState(getTabFromHash(supportedTabs));
    const [instance, setInstance] = useState<Task | null>(null);

    const initializeData = async (id: number): Promise<void> => {
        try {
            const taskInstance = await fetchTask(id);

            setInstance(taskInstance);
            try {
                dispatch(reducerActions.setConsensusSettingsFetching(true));
                const settings = await core.consensus.settings.get({ taskID: taskInstance.id });
                dispatch(reducerActions.setConsensusSettings(settings));
            } finally {
                dispatch(reducerActions.setConsensusSettingsFetching(false));
            }
        } catch (error: unknown) {
            dispatch(reducerActions.setError(error instanceof Error ? error : new Error('Unknown error')));
        } finally {
            dispatch(reducerActions.setFetching(false));
        }
    };

    const onSaveConsensusSettings = useCallback(async (values) => {
        try {
            const { settings } = state.consensusSettings;
            if (settings) {
                settings.quorum = values.quorum / 100;
                settings.iouThreshold = values.iouThreshold / 100;

                try {
                    dispatch(reducerActions.setConsensusSettingsFetching(true));
                    const responseSettings = await settings.save();
                    dispatch(reducerActions.setConsensusSettings(responseSettings));
                    notification.info({ message: 'Settings have been updated' });
                } catch (error: unknown) {
                    notification.error({
                        message: 'Could not save consensus settings',
                        description: typeof Error === 'object' ? (error as object).toString() : '',
                    });
                    throw error;
                } finally {
                    dispatch(reducerActions.setConsensusSettingsFetching(false));
                }
            }
            return settings;
        } catch (e) {
            return false;
        }
    }, [state.consensusSettings.settings]);

    useEffect(() => {
        initializeData(requestedInstanceID);
    }, [requestedInstanceID]);

    useEffect(() => {
        const onHashChange = () => setActiveTab(getTabFromHash(supportedTabs));
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    useEffect(() => {
        window.history.replaceState(null, '', `#${activeTab}`);
    }, [activeTab]);

    const onTabKeyChange = useCallback((key: string): void => {
        setActiveTab(key);
    }, []);

    const backNavigation: JSX.Element | null = (
        <Row justify='center'>
            <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                <GoBackButton />
            </Col>
        </Row>
    );
    let title: JSX.Element | null = null;
    let tabs: JSX.Element | null = null;

    const {
        fetching,
        error,
        consensusSettings: {
            settings: consensusSettings,
            fetching: consensusSettingsFetching,
        },
    } = state;

    if (error) {
        return (
            <div className='cvat-consensus-management-page'>
                <div className='cvat-consensus-management-page-error'>
                    <Result
                        status='error'
                        title='Could not open the page'
                        subTitle={error.message}
                        extra={backNavigation}
                    />
                </div>
            </div>
        );
    }

    if (fetching || consensusSettingsFetching) {
        return (
            <div className='cvat-consensus-management-page'>
                <div className='cvat-consensus-management-loading'>
                    <CVATLoadingSpinner />
                </div>
            </div>
        );
    }

    if (instance) {
        title = (
            <Col className='cvat-consensus-management-header'>
                <Title level={4} className='cvat-text-color'>
                    {'Consensus management for '}
                    <ResourceLink resource={instance} />
                </Title>
            </Col>
        );

        const tabsItems: NonNullable<TabsProps['items']>[0][] = [];

        if (consensusSettings) {
            tabsItems.push({
                key: TabName.settings,
                label: 'Settings',
                children: (
                    <ConsensusSettingsTab
                        fetching={fetching}
                        settings={consensusSettings}
                        setSettings={onSaveConsensusSettings}
                    />
                ),
            });
        }

        tabs = (
            <Tabs
                type='card'
                activeKey={activeTab}
                defaultActiveKey={DEFAULT_TAB}
                onChange={onTabKeyChange}
                className='cvat-consensus-management-page-tabs'
                items={tabsItems}
            />
        );
    }

    return (
        <div className='cvat-consensus-management-page'>
            <Row className='cvat-consensus-management-wrapper'>
                <Col span={24}>
                    {backNavigation}
                    <Row justify='center' className='cvat-consensus-management-inner-wrapper'>
                        <Col span={22} xl={18} xxl={14} className='cvat-consensus-management-inner'>
                            {title}
                            {tabs}
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ConsensusManagementPage);
