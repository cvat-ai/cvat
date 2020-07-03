// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';

import consts from 'consts';
import { EmptyTasksIcon as EmptyModelsIcon } from 'icons';

export default function EmptyListComponent(): JSX.Element {
    return (
        <div className='cvat-empty-models-list'>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Icon className='cvat-empty-models-icon' component={EmptyModelsIcon} />
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text strong>No models deployed yet...</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text type='secondary'>To annotate your tasks automatically</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Text type='secondary'>deploy a model with </Text>
                    <a href={`${consts.NUCLIO_GUIDE}`}>nuclio</a>
                </Col>
            </Row>
        </div>
    );
}
