// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { Row } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import {
    Project, QualityReport, QualitySettings, getCore,
} from 'cvat-core-wrapper';
import { useIsMounted } from 'utils/hooks';
import ConflictsSummary from './conflicts-summary';
import CoverageSummary from './coverage-summary';
import QualitySettingsModal from './quality-settings-modal';
import QualitySummary from './quality-summary';
import TaskList from './task-list';

const core = getCore();

interface Props {
    project: Project,
}

function ProjectQualityComponent(props: Props): JSX.Element {
    const { project } = props;

    const isMounted = useIsMounted();
    const [fetching, setFetching] = useState<boolean>(true);
    const [projectReport, setProjectReport] = useState<QualityReport | null>(null);
    const [qualitySettings, setQualitySettings] = useState<QualitySettings | null>(null);
    const [qualitySettingsFetching, setQualitySettingsFetching] = useState<boolean>(true);
    const [qualitySettingsVisible, setQualitySettingsVisible] = useState<boolean>(false);

    useEffect(() => {
        setFetching(true);
        setQualitySettingsFetching(true);

        const reportRequest = core.analytics.quality.reports({ projectId: project.id, pageSize: 1, target: 'project' });
        const settingsRequest = core.analytics.quality.settings.get({ projectId: project.id }, true);

        Promise.all([reportRequest, settingsRequest]).then(([[report], settings]) => {
            if (isMounted()) {
                setQualitySettings(settings);
                if (report) {
                    setProjectReport(report);
                }
            }
        }).catch((error: Error) => {
            if (isMounted()) {
                notification.error({
                    description: error.toString(),
                    message: 'Could not initialize quality analytics page',
                });
            }
        }).finally(() => {
            if (isMounted()) {
                setQualitySettingsFetching(false);
                setFetching(false);
            }
        });
    }, [project?.id]);

    return (
        <div className='cvat-project-quality-page'>
            {
                fetching ? (
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
                        <QualitySettingsModal
                            projectId={project.id}
                            qualitySettings={qualitySettings}
                            setQualitySettings={setQualitySettings}
                            fetching={qualitySettingsFetching}
                            visible={qualitySettingsVisible}
                            setVisible={setQualitySettingsVisible}
                        />
                    </>
                )
            }
        </div>
    );
}

export default React.memo(ProjectQualityComponent);
