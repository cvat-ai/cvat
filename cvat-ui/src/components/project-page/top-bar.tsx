// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Icon, { LeftOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Text from 'antd/lib/typography/Text';

import { Project } from 'reducers/interfaces';
import ActionsMenu from 'components/projects-page/actions-menu';
import { MenuIcon } from 'icons';

interface DetailsComponentProps {
    projectInstance: Project;
}

export default function ProjectTopBar(props: DetailsComponentProps): JSX.Element {
    const { projectInstance } = props;

    const history = useHistory();

    return (
        <Row className='cvat-task-top-bar' type='flex' justify='space-between' align='middle'>
            <Col>
                <Button onClick={() => history.push('/projects')} type='link' size='large'>
                    <LeftOutlined />
                    Back to projects
                </Button>
            </Col>
            <Col className='cvat-project-top-bar-actions'>
                <Dropdown overlay={<ActionsMenu projectInstance={projectInstance.instance} />}>
                    <Button size='large'>
                        <Text className='cvat-text-color'>Actions</Text>
                        <Icon className='cvat-menu-icon' component={MenuIcon} />
                    </Button>
                </Dropdown>
            </Col>
        </Row>
    );
}
