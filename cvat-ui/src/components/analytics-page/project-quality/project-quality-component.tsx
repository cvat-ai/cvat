// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useState } from 'react';
import {
    Project, QualityReport, QualitySettings, getCore,
} from 'cvat-core-wrapper';
import { Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import { useIsMounted } from 'utils/hooks';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import QualitySummary from './quality-summary';
import TaskList from './task-list';
import ConflictsSummary from './conflicts-summary';
import CoverageSummary from './coverage-summary';
import QualitySettingsModal from './quality-settings-modal';

interface Props {
    project: Project,
}

function ProjectQualityComponent(props: Props): JSX.Element {
    const { project } = props;
    const isMounted = useIsMounted();

    const [projectReport, setProjectReport] = useState<QualityReport | null>(null);

    const [qualitySettings, setQualitySettings] = useState<QualitySettings | null>(null);
    const [qualitySettingsFetching, setQualitySettingsFetching] = useState<boolean>(true);
    const [qualitySettingsVisible, setQualitySettingsVisible] = useState<boolean>(false);
    const [qualitySettingsInitialized, setQualitySettingsInitialized] = useState<boolean>(false);

    useEffect(() => {
        const core = getCore();

        core.analytics.quality.reports({ projectId: project.id, target: 'project' })
            .then((results: QualityReport[]) => {
                setProjectReport(results[0]);
            })
            .catch((_error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: _error.toString(),
                        message: "Couldn't fetch reports",
                        className: 'cvat-notification-notice-get-reports-error',
                    });
                }
            });

        core.analytics.quality.settings.get({ projectId: project.id })
            .then((result: QualitySettings | null) => {
                setQualitySettings(result);

                if (!result) {
                    core.analytics.quality.settings.defaults().then((defaults: object) => {
                        setQualitySettings(new QualitySettings({
                            ...defaults,
                            project_id: project.id,
                        }));
                        setQualitySettingsInitialized(false);
                        setQualitySettingsFetching(false);
                    }).catch((_error: any) => {
                        if (isMounted()) {
                            notification.error({
                                description: _error.toString(),
                                message: "Couldn't fetch default settings",
                                className: 'cvat-notification-notice-get-settings-error',
                            });
                        }
                    });
                } else {
                    setQualitySettingsInitialized(true);
                    setQualitySettingsFetching(false);
                }
            })
            .catch((_error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: _error.toString(),
                        message: "Couldn't fetch settings",
                        className: 'cvat-notification-notice-get-settings-error',
                    });
                }
            });
    }, [project?.id]);

    return (
        <div className='cvat-project-quality-page'>
            {
                qualitySettingsFetching ? (
                    <CVATLoadingSpinner size='large' />
                ) : (
                    <>
                        <Row>
                            <QualitySummary
                                projectId={project.id}
                                projectReport={projectReport}
                                setQualitySettingsVisible={setQualitySettingsVisible}
                            />
                        </Row>
                        <Row gutter={16}>
                            <ConflictsSummary projectId={project.id} projectReport={projectReport} />
                            <CoverageSummary projectId={project.id} projectReport={projectReport} />
                        </Row>
                        {
                            (!projectReport || !projectReport.summary.gtCount) ? (
                                <Row>
                                    <Text type='secondary' className='cvat-task-quality-reports-hint'>
                                        Quality estimation requires annotated GT jobs in the project tasks.
                                        Please add more GT jobs to make the estimates more accurate.
                                    </Text>
                                </Row>
                            ) : null
                        }
                        <Row>
                            <TaskList projectId={project.id} projectReport={projectReport} />
                        </Row>
                    </>
                )
            }
            <QualitySettingsModal
                projectId={project.id}
                qualitySettings={qualitySettings}
                setQualitySettings={setQualitySettings}
                fetching={qualitySettingsFetching}
                visible={qualitySettingsVisible}
                setVisible={setQualitySettingsVisible}
                settingsInitialized={qualitySettingsInitialized}
                setInitialized={setQualitySettingsInitialized}
            />
        </div>
    );
}

export default React.memo(ProjectQualityComponent);
