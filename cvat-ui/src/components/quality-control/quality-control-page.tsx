// Copyright (C) CVAT.ai Corporation
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
import Result from 'antd/lib/result';

import {
    Job, JobType, QualityReport, QualitySettings, Task,
    TaskValidationLayout, getCore, FramesMetaData,
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

interface State {
    fetching: boolean;
    reportRefreshingStatus: string | null;
    validationLayout: TaskValidationLayout | null;
    gtJobInstance: Job | null;
    gtJobMeta: FramesMetaData | null;
    error: Error | null;
    qualitySettings: {
        settings: QualitySettings | null;
        fetching: boolean;
    };
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
    SET_VALIDATION_LAYOUT = 'SET_VALIDATION_LAYOUT',
    SET_ERROR = 'SET_ERROR',
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
    setGtJob: (gtJobInstance: Job | null) => (
        createAction(ReducerActionType.SET_GT_JOB, { gtJobInstance })
    ),
    setGtJobMeta: (gtJobMeta: FramesMetaData | null) => (
        createAction(ReducerActionType.SET_GT_JOB_META, { gtJobMeta })
    ),
    setValidationLayout: (validationLayout: TaskValidationLayout | null) => (
        createAction(ReducerActionType.SET_VALIDATION_LAYOUT, { validationLayout })
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

    if (action.type === ReducerActionType.SET_QUALITY_SETTINGS) {
        return {
            ...state,
            qualitySettings: {
                ...state.qualitySettings,
                settings: action.payload.qualitySettings,
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
            gtJobInstance: action.payload.gtJobInstance,
        };
    }

    if (action.type === ReducerActionType.SET_GT_JOB_META) {
        return {
            ...state,
            gtJobMeta: action.payload.gtJobMeta,
        };
    }

    if (action.type === ReducerActionType.SET_VALIDATION_LAYOUT) {
        return {
            ...state,
            validationLayout: action.payload.validationLayout,
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

function QualityControlPage(): JSX.Element {
    const supportedTabs = ['overview', 'settings', 'management'];
    const [state, dispatch] = useReducer(reducer, {
        fetching: true,
        reportRefreshingStatus: null,
        gtJobInstance: null,
        gtJobMeta: null,
        validationLayout: null,
        error: null,
        qualitySettings: {
            settings: null,
            fetching: false,
        },
    });

    const requestedInstanceID = +useParams<{ tid: string }>().tid;

    const [activeTab, setActiveTab] = useState(getTabFromHash(supportedTabs));
    const [instance, setInstance] = useState<Task | null>(null);

    const initializeData = async (id: number): Promise<void> => {
        try {
            let taskInstance = null;
            try {
                [taskInstance] = await core.tasks.get({ id });
            } catch (error: unknown) {
                throw new Error('The task was not found on the server');
            }

            setInstance(taskInstance);
            try {
                dispatch(reducerActions.setQualitySettingsFetching(true));
                const settings = await core.analytics.quality.settings.get({ taskID: taskInstance.id });
                dispatch(reducerActions.setQualitySettings(settings));
            } finally {
                dispatch(reducerActions.setQualitySettingsFetching(false));
            }

            const gtJob = taskInstance.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH) ?? null;
            if (gtJob) {
                const validationLayout: TaskValidationLayout | null = await taskInstance.validationLayout();
                const gtJobMeta = await core.frames.getMeta('job', gtJob.id) as FramesMetaData;
                dispatch(reducerActions.setGtJob(gtJob));
                dispatch(reducerActions.setGtJobMeta(gtJobMeta));
                dispatch(reducerActions.setValidationLayout(validationLayout));
            }
        } catch (error: unknown) {
            dispatch(reducerActions.setError(error instanceof Error ? error : new Error('Unknown error')));
        } finally {
            dispatch(reducerActions.setFetching(false));
        }
    };

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
                settings.emptyIsAnnotated = values.emptyIsAnnotated;

                settings.oksSigma = values.oksSigma / 100;
                settings.pointSizeBase = values.pointSizeBase;

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

    const updateMeta = async (): Promise<void> => {
        dispatch(reducerActions.setFetching(true));
        try {
            const [newMeta] = await (state.gtJobInstance as Job).frames.save();
            const validationLayout: TaskValidationLayout | null = await (instance as Task).validationLayout();
            dispatch(reducerActions.setGtJobMeta(newMeta));
            dispatch(reducerActions.setValidationLayout(validationLayout));
        } finally {
            dispatch(reducerActions.setFetching(false));
        }
    };

    const onDeleteFrames = useCallback((frameIDs: number[]): void => {
        if (state.gtJobInstance && instance) {
            for (const frameID of frameIDs) {
                state.gtJobInstance.frames.delete(frameID);
            }

            updateMeta();
        }
    }, [state.gtJobInstance]);

    const onRestoreFrames = useCallback((frameIDs: number[]): void => {
        if (state.gtJobInstance && instance) {
            for (const frameID of frameIDs) {
                state.gtJobInstance.frames.restore(frameID);
            }

            updateMeta();
        }
    }, [state.gtJobInstance]);

    useEffect(() => {
        initializeData(requestedInstanceID);
    }, [requestedInstanceID]);

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
        gtJobInstance,
        gtJobMeta,
        validationLayout,
        error,
        qualitySettings: {
            settings: qualitySettings,
            fetching: qualitySettingsFetching,
        },
    } = state;

    if (error) {
        return (
            <div className='cvat-quality-control-page'>
                <div className='cvat-quality-control-page-error'>
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

    if (fetching || qualitySettingsFetching) {
        return (
            <div className='cvat-quality-control-page'>
                <div className='cvat-quality-control-loading'>
                    <CVATLoadingSpinner />
                </div>
            </div>
        );
    }

    if (instance) {
        title = (
            <Col>
                <Title level={4} className='cvat-text-color cvat-quality-page-header'>
                    Quality control for
                    <Link to={`/tasks/${instance.id}`}>{` Task #${instance.id}`}</Link>
                </Title>
            </Col>
        );

        const tabsItems: NonNullable<TabsProps['items']>[0][] = [];

        if (qualitySettings) {
            tabsItems.push({
                key: 'overview',
                label: 'Overview',
                children: (
                    <QualityOverviewTab task={instance} qualitySettings={qualitySettings} />
                ),
            });
        }

        if (gtJobInstance && gtJobMeta) {
            if (validationLayout && qualitySettings) {
                tabsItems.push({
                    key: 'management',
                    label: 'Management',
                    children: (
                        <QualityManagementTab
                            task={instance}
                            gtJobId={gtJobInstance.id}
                            gtJobMeta={gtJobMeta}
                            validationLayout={validationLayout}
                            qualitySettings={qualitySettings}
                            onDeleteFrames={onDeleteFrames}
                            onRestoreFrames={onRestoreFrames}
                        />
                    ),
                });
            }

            tabsItems.push({
                key: 'settings',
                label: 'Settings',
                children: (
                    <QualitySettingsTab
                        fetching={qualitySettingsFetching}
                        qualitySettings={qualitySettings}
                        setQualitySettings={onSaveQualitySettings}
                    />
                ),
            });
        }

        tabs = (
            <Tabs
                type='card'
                activeKey={activeTab}
                defaultActiveKey='Overview'
                onChange={onTabKeyChange}
                className='cvat-task-control-tabs'
                items={tabsItems}
            />
        );
    }

    return (
        <div className='cvat-quality-control-page'>
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
        </div>
    );
}

export default React.memo(QualityControlPage);
