// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, {
    useCallback, useEffect, useReducer, useState,
} from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Title from 'antd/lib/typography/Title';
import notification from 'antd/lib/notification';
import { useIsMounted } from 'utils/hooks';
import {
    Job, JobType, QualityReport, QualitySettings, RQStatus, Task, getCore,
} from 'cvat-core-wrapper';
import { updateJobAsync } from 'actions/jobs-actions';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import { ActionUnion, createAction } from 'utils/redux';
import { BASE_TARGET_THRESHOLD, qualityColorGenerator, QualityColors } from 'utils/quality';
import TaskQualityComponent from './task-quality/task-quality-component';
import TaskQualityManagementComponent from './task-quality/task-quality-magement-component';
import QualitySettingsComponent from './quality-settings';

const core = getCore();

function getTabFromHash(supportedTabs: string[]): string {
    const tab = window.location.hash.slice(1);
    return supportedTabs.includes(tab) ? tab : supportedTabs[0];
}

function readInstanceType(): InstanceType {
    return 'task';
}

function readInstanceId(): number {
    return +useParams<{ tid: string }>().tid;
}

type InstanceType = 'project' | 'task' | 'job';

interface State {
    fetching: boolean;
    reportRefreshingStatus: string | null;
    qualitySettings: {
        settings: QualitySettings | null;
        fetching: boolean;
        visible: boolean;
        getQualityColor: (value?: number) => QualityColors;
    },
}

enum ReducerActionType {
    SET_FETCHING = 'SET_FETCHING',
    SET_TASK_REPORT = 'SET_TASK_REPORT',
    SET_JOBS_REPORTS = 'SET_JOBS_REPORTS',
    SET_QUALITY_SETTINGS = 'SET_QUALITY_SETTINGS',
    SET_QUALITY_SETTINGS_VISIBLE = 'SET_QUALITY_SETTINGS_VISIBLE',
    SET_QUALITY_SETTINGS_FETCHING = 'SET_QUALITY_SETTINGS_FETCHING',
    SET_REPORT_REFRESHING_STATUS = 'SET_REPORT_REFRESHING_STATUS',
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
    setQualitySettings: (qualitySettings: QualitySettings) => (
        createAction(ReducerActionType.SET_QUALITY_SETTINGS, { qualitySettings })
    ),
    setQualitySettingsVisible: (visible: boolean) => (
        createAction(ReducerActionType.SET_QUALITY_SETTINGS_VISIBLE, { visible })
    ),
    setQualitySettingsFetching: (fetching: boolean) => (
        createAction(ReducerActionType.SET_QUALITY_SETTINGS_FETCHING, { fetching })
    ),
    setReportRefreshingStatus: (status: string | null) => (
        createAction(ReducerActionType.SET_REPORT_REFRESHING_STATUS, { status })
    ),
};

const reducer = (state: State, action: ActionUnion<typeof reducerActions>): State => {
    if (action.type === ReducerActionType.SET_FETCHING) {
        return {
            ...state,
            fetching: action.payload.fetching,
        };
    }

    if (action.type === ReducerActionType.SET_QUALITY_SETTINGS) {
        return {
            ...state,
            qualitySettings: {
                ...state.qualitySettings,
                settings: action.payload.qualitySettings,
                getQualityColor: qualityColorGenerator(action.payload.qualitySettings.targetMetricThreshold),
            },
        };
    }

    if (action.type === ReducerActionType.SET_QUALITY_SETTINGS_FETCHING) {
        return {
            ...state,
            qualitySettings: {
                ...state.qualitySettings,
                fetching: action.payload.fetching,
            },
        };
    }

    if (action.type === ReducerActionType.SET_REPORT_REFRESHING_STATUS) {
        return {
            ...state,
            reportRefreshingStatus: action.payload.status,
        };
    }

    return state;
};

function QualityControlPage(): JSX.Element {
    const appDispatch = useDispatch();
    const [state, dispatch] = useReducer(reducer, {
        fetching: true,
        reportRefreshingStatus: null,
        qualitySettings: {
            settings: null,
            fetching: true,
            visible: false,
            getQualityColor: qualityColorGenerator(BASE_TARGET_THRESHOLD),
        },
    });

    const requestedInstanceType: InstanceType = readInstanceType();
    const requestedInstanceID = readInstanceId();

    const [instanceType, setInstanceType] = useState<InstanceType | null>(null);
    const [instance, setInstance] = useState<Task | null>(null);
    const isMounted = useIsMounted();

    const supportedTabs = ['overview', 'settings', 'management'];
    const [activeTab, setTab] = useState(getTabFromHash(supportedTabs));
    const receiveInstance = async (type: InstanceType, id: number): Promise<Task | null> => {
        let receivedInstance: Task | null = null;

        try {
            switch (type) {
                case 'task': {
                    [receivedInstance] = await core.tasks.get({ id });
                    break;
                }
                default:
                    return null;
            }

            if (isMounted()) {
                setInstance(receivedInstance);
                setInstanceType(type);
            }
            return receivedInstance;
        } catch (error: unknown) {
            notification.error({
                message: `Could not receive requested ${type}`,
                description: `${error instanceof Error ? error.message : ''}`,
            });
            return null;
        }
    };

    const receiveSettings = useCallback(async (taskInstance: Task) => {
        dispatch(reducerActions.setQualitySettingsFetching(true));

        function handleError(error: Error): void {
            if (isMounted()) {
                notification.error({
                    description: error.toString(),
                    message: 'Could not initialize quality analytics page',
                });
            }
        }

        try {
            const settingsRequest = core.analytics.quality.settings.get({ taskID: taskInstance.id });

            await Promise.all([settingsRequest]).then(([settings]) => {
                dispatch(reducerActions.setQualitySettings(settings));
            }).catch(handleError).finally(() => {
                dispatch(reducerActions.setQualitySettingsFetching(false));
                dispatch(reducerActions.setFetching(false));
            });
        } catch (error: unknown) {
            handleError(error as Error);
        }
    }, [instance]);

    const onCreateReport = useCallback(() => {
        if (instance) {
            const onUpdate = (status: RQStatus, progress: number, message: string): void => {
                dispatch(reducerActions.setReportRefreshingStatus(message));
            };

            const body = { taskID: instance.id };

            core.analytics.quality.calculate(body, onUpdate).then(() => {
                receiveSettings(instance);
            }).finally(() => {
                dispatch(reducerActions.setReportRefreshingStatus(null));
            }).catch((error: unknown) => {
                if (isMounted()) {
                    notification.error({
                        message: 'Error occurred during requesting performance report',
                        description: error instanceof Error ? error.message : '',
                    });
                }
            });
        }
    }, [instance]);

    const onSaveQualitySettings = useCallback(async (values) => {
        try {
            const { settings } = state.qualitySettings;
            if (settings) {
                settings.lowOverlapThreshold = values.lowOverlapThreshold / 100;
                settings.iouThreshold = values.iouThreshold / 100;
                settings.compareAttributes = values.compareAttributes;

                settings.oksSigma = values.oksSigma / 100;

                settings.lineThickness = values.lineThickness / 100;
                settings.lineOrientationThreshold = values.lineOrientationThreshold / 100;
                settings.orientedLines = values.orientedLines;

                settings.compareGroups = values.compareGroups;
                settings.groupMatchThreshold = values.groupMatchThreshold / 100;

                settings.checkCoveredAnnotations = values.checkCoveredAnnotations;
                settings.objectVisibilityThreshold = values.objectVisibilityThreshold / 100;

                settings.panopticComparison = values.panopticComparison;

                try {
                    dispatch(reducerActions.setQualitySettingsFetching(true));
                    const responseSettings = await settings.save();
                    dispatch(reducerActions.setQualitySettings(responseSettings));
                } catch (error: unknown) {
                    notification.error({
                        message: 'Could not save quality settings',
                        description: typeof Error === 'object' ? (error as object).toString() : '',
                    });
                    throw error;
                } finally {
                    dispatch(reducerActions.setQualitySettingsFetching(false));
                }
            }
            return settings;
        } catch (e) {
            return false;
        }
    }, [state.qualitySettings.settings]);

    useEffect(() => {
        if (Number.isInteger(requestedInstanceID) && ['project', 'task', 'job'].includes(requestedInstanceType)) {
            dispatch(reducerActions.setFetching(true));
            receiveInstance(requestedInstanceType, requestedInstanceID).then((task) => {
                if (task) {
                    receiveSettings(task);
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
            const hash = getTabFromHash(supportedTabs);
            setTab(hash);
        });
    }, []);

    useEffect(() => {
        window.location.hash = activeTab;
    }, [activeTab]);

    const onJobUpdate = useCallback((job: Job, data: Parameters<Job['save']>[0]): void => {
        dispatch(reducerActions.setFetching(true));
        appDispatch(updateJobAsync(job, data)).finally(() => {
            if (isMounted()) {
                dispatch(reducerActions.setFetching(false));
            }
        });
    }, []);

    const onTabKeyChange = useCallback((key: string): void => {
        setTab(key);
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

        const tabsItems = [];
        const gtJob = instance.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);
        tabsItems.push([{
            key: 'overview',
            label: 'Overview',
            children: (
                <TaskQualityComponent
                    task={instance}
                    onJobUpdate={onJobUpdate}
                    onCreateReport={onCreateReport}
                    reportRefreshingStatus={state.reportRefreshingStatus}
                    getQualityColor={state.qualitySettings.getQualityColor}
                />
            ),
        }, 10]);

        tabsItems.push([{
            key: 'management',
            label: 'Management',
            children: (
                <TaskQualityManagementComponent
                    task={instance}
                    onJobUpdate={onJobUpdate}
                    onCreateReport={onCreateReport}
                    reportRefreshingStatus={state.reportRefreshingStatus}
                    getQualityColor={state.qualitySettings.getQualityColor}
                />
            ),
        }, 20]);

        if (gtJob) {
            tabsItems.push([{
                key: 'settings',
                label: 'Settings',
                children: (
                    <QualitySettingsComponent
                        fetching={state.qualitySettings.fetching}
                        qualitySettings={state.qualitySettings.settings}
                        setQualitySettings={onSaveQualitySettings}
                    />
                ),
            }, 30]);
        }

        tabs = (
            <Tabs
                type='card'
                activeKey={activeTab}
                defaultActiveKey='Overview'
                onChange={onTabKeyChange}
                className='cvat-task-analytics-tabs'
                items={tabsItems.sort((item1, item2) => item1[1] - item2[1])
                    .map((item) => item[0])}
            />
        );
    }

    return (
        <div className='cvat-analytics-page'>
            {state.fetching && state.qualitySettings.fetching ? (
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
