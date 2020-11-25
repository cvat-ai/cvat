// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';

import ActionsMenuContainer from 'containers/actions-menu/actions-menu';
import { MenuIcon } from 'icons';

interface DetailsComponentProps {
    taskInstance: any;
}

export default function DetailsComponent(props: DetailsComponentProps): JSX.Element {
    const { taskInstance } = props;
    const { id } = taskInstance;

    return (
        <Row className='cvat-task-top-bar' type='flex' justify='space-between' align='middle'>
            <Col>
                <Text className='cvat-title'>{`Task details #${id}`}</Text>
            </Col>
            <Col>
                <Dropdown overlay={<ActionsMenuContainer taskInstance={taskInstance} />}>
                    <Button size='large'>
                        <Text className='cvat-text-color'>Actions</Text>
                        <Icon className='cvat-menu-icon' component={MenuIcon} />
                    </Button>
                </Dropdown>
            </Col>
        </Row>
    );
}
