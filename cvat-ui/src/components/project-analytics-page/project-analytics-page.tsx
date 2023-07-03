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
import { getCore } from 'cvat-core-wrapper';
import ProjectQualityComponent from './quality/project-quality-component';

const core = getCore();

function ProjectAnalyticsPage(): JSX.Element {
    const [fetchingProject, setFetchingProject] = useState(true);
    const [projectInstance, setProjectInstance] = useState<Project | null>(null);
    const isMounted = useIsMounted();

    const history = useHistory();

    const id = +useParams<{ id: string }>().id;

    const receiveProject = (): void => {
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
                description: `Requested project id "${id}" is not valid`,
            });
            setFetchingProject(false);
        }
    };

    useEffect((): void => {
        receiveProject();
    }, [id]);

    return (
        <div className='cvat-project-analytics-page'>
            {
                fetchingProject ? (
                    <div className='cvat-create-task-loading'>
                        <Spin size='large' className='cvat-spinner' />
                    </div>
                ) : (
                    <Row
                        justify='center'
                        align='top'
                        className='cvat-analytics-wrapper'
                    >
                        <Col span={22} xl={18} xxl={14} className='cvat-project-top-bar'>
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
                            <Col className='cvat-project-analytics-title'>
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
                                            <Text>Quality</Text>
                                        </span>
                                    )}
                                    key='quality'
                                >
                                    <ProjectQualityComponent project={projectInstance} />
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
