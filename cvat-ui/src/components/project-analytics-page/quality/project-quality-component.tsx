// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React, { useEffect, useState } from 'react';
import { Project, QualityReport, QualitySettings, getCore } from 'cvat-core-wrapper';
import { Col, Row } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import QualitySummary from './quality-summary';
import TaskList from './task-list';
import ConflictsSummary from './conflicts-summary';
import CoverageSummary from './coverage-summary';
import QualitySettingsModal from './quality-settings-modal';
import { useIsMounted } from 'utils/hooks';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import { Button, Card } from 'antd';

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

        core.analytics.quality.reports({projectId: project.id, target: 'project'})
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

        core.analytics.quality.settings.get({projectId: project.id})
            .then((result: QualitySettings | null) => {
                setQualitySettingsFetching(false);
                setQualitySettings(result);
                setQualitySettingsInitialized(!!result);
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

    const configureQualitySettings = () => {
        const core = getCore();

        core.analytics.quality.settings.defaults().then((defaults: object) => {
            setQualitySettings(new QualitySettings({
                ...defaults,
                project_id: project.id,
            }));

            setQualitySettingsVisible(true);
        });
    }

    return (
        <div className='cvat-project-quality-page'>
            <>
                {
                qualitySettingsFetching ? <CVATLoadingSpinner size='large' /> :
                ((!qualitySettingsInitialized) ?
                    (
                        <>
                            <Row justify='center'>
                                <Card className='cvat-project-quality-page-not-configured-block'>
                                    <Col>
                                        <Row justify='center'>
                                            <Col>
                                                Quality settings are not configured
                                            </Col>
                                        </Row>
                                        <Row justify='center'>
                                            <Col>
                                                <Button type='primary' onClick={configureQualitySettings}>Configure</Button>
                                            </Col>
                                        </Row>
                                    </Col>
                                </Card>
                            </Row>
                        </>
                    ) : (
                        <>
                            <Row>
                                <QualitySummary projectId={project.id} projectReport={projectReport}
                                    setQualitySettingsVisible={setQualitySettingsVisible}
                                    />
                            </Row>
                            <Row gutter={16}>
                                <ConflictsSummary projectId={project.id} projectReport={projectReport} />
                                <CoverageSummary projectId={project.id} projectReport={projectReport} />
                            </Row>
                            <Row>
                                <TaskList projectId={project.id} projectReport={projectReport} />
                            </Row>
                        </>
                    )
                )
                }
                <QualitySettingsModal projectId={project.id}
                    qualitySettings={qualitySettings} setQualitySettings={setQualitySettings}
                    fetching={qualitySettingsFetching}
                    visible={qualitySettingsVisible} setVisible={setQualitySettingsVisible}
                    settingsInitialized={qualitySettingsInitialized} setInitialized={setQualitySettingsInitialized}
                />
            </>
        </div>
    );
}

export default React.memo(ProjectQualityComponent);
