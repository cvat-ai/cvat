// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Spin from 'antd/lib/spin';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { LeftOutlined } from '@ant-design/icons/lib/icons';
import { useIsMounted } from 'utils/hooks';
import { Project } from 'reducers';
import { AnalyticsReport, getCore } from 'cvat-core-wrapper';
import AnalyticsOverview from 'components/analytics-overview/analytics-overview';

const core = getCore();

function ProjectAnalyticsPage(): JSX.Element {
    const [fetchingProject, setFetchingProject] = useState(true);
    const [projectInstance, setProjectInstance] = useState<Project | null>(null);
    const [analyticsReportInstance, setAnalyticsReportInstance] = useState<AnalyticsReport | null>(null);
    const isMounted = useIsMounted();

    const history = useHistory();

    const id = +useParams<{ id: string }>().id;

    const receieveProject = (): void => {
        if (Number.isInteger(id)) {
            core.projects.get({ id })
                .then(([project]: Project[]) => {
                    if (isMounted() && project) {
                        setProjectInstance(project);
                    }
                }).catch((error: Error) => {
                    if (isMounted()) {
                        notification.error({
                            message: 'Could not receive the requested project from the server',
                            description: error.toString(),
                        });
                    }
                }).finally(() => {
                    if (isMounted()) {
                        setFetchingProject(false);
                    }
                });
        } else {
            notification.error({
                message: 'Could not receive the requested project from the server',
                description: `Requested task id "${id}" is not valid`,
            });
            setFetchingProject(false);
        }
    };

    // TODO make it via get Analytics report action after Honeypot merge
    const receieveReport = (): void => {
        if (Number.isInteger(id)) {
            core.analytics.common.reports({ projectID: id })
                .then((report: AnalyticsReport) => {
                    if (isMounted() && report) {
                        setAnalyticsReportInstance(report);
                    }
                }).catch((error: Error) => {
                    if (isMounted()) {
                        notification.error({
                            message: 'Could not receive the requested report from the server',
                            description: error.toString(),
                        });
                    }
                });
        }
    };
    console.log(analyticsReportInstance);

    useEffect((): void => {
        receieveProject();
        receieveReport();
    }, []);

    return (
        <div className='cvat-project-analytics-page'>
            {
                fetchingProject ? (
                    <div className='cvat-create-job-loding'>
                        <Spin size='large' className='cvat-spinner' />
                    </div>
                ) : (
                    <Row
                        justify='center'
                        align='top'
                        className='cvat-analytics-wrapper'
                    >
                        <Col span={22} xl={18} xxl={14} className='cvat-task-top-bar'>
                            <Button
                                className='cvat-back-to-project-button'
                                onClick={() => history.push(`/projects/${projectInstance.id}`)}
                                type='link'
                                size='large'
                            >
                                <LeftOutlined />
                                Back to project
                            </Button>
                        </Col>
                        <Col span={22} xl={18} xxl={14} className='cvat-analytics-inner'>
                            <Col className='cvat-task-analytics-title'>
                                <Title
                                    level={4}
                                    className='cvat-text-color'
                                >
                                    {projectInstance.name}
                                </Title>
                                <Text
                                    type='secondary'
                                >
                                    {`#${projectInstance.id}`}
                                </Text>
                            </Col>
                            <Tabs type='card'>
                                <Tabs.TabPane
                                    tab={(
                                        <span>
                                            <Text>Overview</Text>
                                        </span>
                                    )}
                                    key='Overview'
                                >
                                    <AnalyticsOverview report={analyticsReportInstance} />
                                </Tabs.TabPane>
                            </Tabs>
                        </Col>
                    </Row>
                )
            }
        </div>
    );
}

export default React.memo(ProjectAnalyticsPage);
