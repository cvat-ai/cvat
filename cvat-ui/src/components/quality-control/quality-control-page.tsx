// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, {
    useCallback, useEffect, useReducer, useState,
} from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Tabs, { TabsProps } from 'antd/lib/tabs';
import Title from 'antd/lib/typography/Title';
import notification from 'antd/lib/notification';
import { useIsMounted } from 'utils/hooks';
import {
    Job, JobType, QualityReport, QualitySettings, Task, getCore, FramesMetaData,
    TargetMetric,
} from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import { ActionUnion, createAction } from 'utils/redux';
import QualityOverviewTab from './task-quality/quality-overview-tab';
import QualityManagementTab from './task-quality/quality-magement-tab';
import QualitySettingsTab from './quality-settings-tab';

const core = getCore();

function getTabFromHash(supportedTabs: string[]): string {
    const tab = window.location.hash.slice(1);
    return supportedTabs.includes(tab) ? tab : supportedTabs[0];
}

type InstanceType = 'task';

interface State {
    fetching: boolean;
    reportRefreshingStatus: string | null;
    gtJob: {
        instance: Job | null,
        meta: FramesMetaData | null,
    },
    qualitySettings: {
        settings: QualitySettings | null;
        fetching: boolean;
        targetMetric: TargetMetric | null;
    },
}

enum ReducerActionType {
    SET_FETCHING = 'SET_FETCHING',
    SET_TASK_REPORT = 'SET_TASK_REPORT',
    SET_JOBS_REPORTS = 'SET_JOBS_REPORTS',
    SET_QUALITY_SETTINGS = 'SET_QUALITY_SETTINGS',
    SET_QUALITY_SETTINGS_FETCHING = 'SET_QUALITY_SETTINGS_FETCHING',
    SET_REPORT_REFRESHING_STATUS = 'SET_REPORT_REFRESHING_STATUS',
    SET_GT_JOB = 'SET_GT_JOB',
    SET_GT_JOB_META = 'SET_GT_JOB_META',
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
    setQualitySettingsFetching: (fetching: boolean) => (
        createAction(ReducerActionType.SET_QUALITY_SETTINGS_FETCHING, { fetching })
    ),
    setReportRefreshingStatus: (status: string | null) => (
        createAction(ReducerActionType.SET_REPORT_REFRESHING_STATUS, { status })
    ),
    setGtJob: (job: Job | null) => (
        createAction(ReducerActionType.SET_GT_JOB, { job })
    ),
    setGtJobMeta: (meta: FramesMetaData | null) => (
        createAction(ReducerActionType.SET_GT_JOB_META, { meta })
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
                targetMetric: action.payload.qualitySettings.targetMetric,
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

    if (action.type === ReducerActionType.SET_GT_JOB) {
        return {
            ...state,
            gtJob: {
                ...state.gtJob,
                instance: action.payload.job,
            },
        };
    }

    if (action.type === ReducerActionType.SET_GT_JOB_META) {
        return {
            ...state,
            gtJob: {
                ...state.gtJob,
                meta: action.payload.meta,
            },
        };
    }

    return state;
};

function QualityControlPage(): JSX.Element {
    const [state, dispatch] = useReducer(reducer, {
        fetching: true,
        reportRefreshingStatus: null,
        gtJob: {
            instance: null,
            meta: null,
        },
        qualitySettings: {
            settings: null,
            fetching: true,
            targetMetric: null,
        },
    });

    const requestedInstanceType: InstanceType = 'task';
    const requestedInstanceID = +useParams<{ tid: string }>().tid;

    const [instanceType, setInstanceType] = useState<InstanceType | null>(null);
    const [instance, setInstance] = useState<Task | null>(null);
    const isMounted = useIsMounted();

    const supportedTabs = ['overview', 'settings', 'management'];
    const [activeTab, setActiveTab] = useState(getTabFromHash(supportedTabs));
    const receiveInstance = async (type: InstanceType, id: number): Promise<Task | null> => {
        let receivedInstance: Task | null = null;
        let gtJob: Job | null = null;
        let gtJobMeta: FramesMetaData | null = null;

        try {
            if (type === 'task') {
                [receivedInstance] = await core.tasks.get({ id });
                gtJob = receivedInstance.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH) ?? null;
                if (gtJob) {
                    gtJobMeta = await core.frames.getMeta('job', gtJob.id) as FramesMetaData;
                }
            } else {
                return null;
            }

            if (isMounted()) {
                dispatch(reducerActions.setGtJob(gtJob));
                dispatch(reducerActions.setGtJobMeta(gtJobMeta));
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
                    message: 'Could not initialize quality control page',
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

    const onSaveQualitySettings = useCallback(async (values) => {
        try {
            const { settings } = state.qualitySettings;
            if (settings) {
                settings.targetMetric = values.targetMetric;
                settings.targetMetricThreshold = values.targetMetricThreshold / 100;

                settings.maxValidationsPerJob = values.maxValidationsPerJob;

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
                    notification.info({ message: 'Settings have been updated' });
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

    const updateMeta = (action: (frameID: number) => void) => async (frameIDs: number[]): Promise<void> => {
        const { instance: gtJob } = state.gtJob;
        if (gtJob) {
            dispatch(reducerActions.setFetching(true));
            await Promise.all(frameIDs.map((frameID: number): void => action(frameID)));
            const [newMeta] = await gtJob.frames.save();
            dispatch(reducerActions.setGtJobMeta(newMeta));
            dispatch(reducerActions.setFetching(false));
        }
    };

    const onDeleteFrames = useCallback(
        updateMeta((frameID: number) => (state.gtJob.instance?.frames.delete(frameID))),
        [state.gtJob.instance],
    );

    const onRestoreFrames = useCallback(
        updateMeta((frameID: number) => (state.gtJob.instance?.frames.restore(frameID))),
        [state.gtJob.instance],
    );

    useEffect(() => {
        if (Number.isInteger(requestedInstanceID) && ['task'].includes(requestedInstanceType)) {
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
            setActiveTab(hash);
        });
    }, []);

    useEffect(() => {
        window.location.hash = activeTab;
    }, [activeTab]);

    const onTabKeyChange = useCallback((key: string): void => {
        setActiveTab(key);
    }, []);

    let backNavigation: JSX.Element | null = null;
    let title: JSX.Element | null = null;
    let tabs: JSX.Element | null = null;

    const {
        fetching,
        gtJob: {
            instance: gtJobInstance,
            meta: gtJobMeta,
        },
        qualitySettings: {
            settings: qualitySettings,
            fetching: qualitySettingsFetching,
            targetMetric,
        },
    } = state;

    const settingsInitialized = qualitySettings && targetMetric;
    if (instanceType && instance && settingsInitialized) {
        backNavigation = (
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                    <GoBackButton />
                </Col>
            </Row>
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

        const tabsItems: [NonNullable<TabsProps['items']>[0], number][] = [];
        tabsItems.push([{
            key: 'overview',
            label: 'Overview',
            children: (
                <QualityOverviewTab task={instance} targetMetric={targetMetric} />
            ),
        }, 10]);

        if (gtJobInstance && gtJobMeta) {
            tabsItems.push([{
                key: 'management',
                label: 'Management',
                children: (
                    <QualityManagementTab
                        task={instance}
                        gtJob={gtJobInstance}
                        gtJobMeta={gtJobMeta}
                        onDeleteFrames={onDeleteFrames}
                        onRestoreFrames={onRestoreFrames}
                        fetching={fetching}
                    />
                ),
            }, 20]);

            tabsItems.push([{
                key: 'settings',
                label: 'Settings',
                children: (
                    <QualitySettingsTab
                        fetching={qualitySettingsFetching}
                        qualitySettings={qualitySettings}
                        setQualitySettings={onSaveQualitySettings}
                    />
                ),
            }, 30]);
        }

        tabsItems.sort((item1, item2) => item1[1] - item2[1]);

        tabs = (
            <Tabs
                type='card'
                activeKey={activeTab}
                defaultActiveKey='Overview'
                onChange={onTabKeyChange}
                className='cvat-task-control-tabs'
                items={tabsItems.map((item) => item[0])}
            />
        );
    }

    return (
        <div className='cvat-quality-control-page'>
            {fetching && qualitySettingsFetching ? (
                <div className='cvat-quality-control-loading'>
                    <CVATLoadingSpinner />
                </div>
            ) : (
                <Row className='cvat-quality-control-wrapper'>
                    <Col span={24}>
                        {backNavigation}
                        <Row justify='center'>
                            <Col span={22} xl={18} xxl={14} className='cvat-quality-control-inner'>
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

export default React.memo(QualityControlPage);
