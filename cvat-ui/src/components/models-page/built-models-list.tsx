// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { Model } from 'reducers/interfaces';
import BuiltModelItemComponent from './built-model-item';

interface Props {
    models: Model[];
}

export default function IntegratedModelsListComponent(props: Props): JSX.Element {
    const { models } = props;
    const items = models.map((model): JSX.Element => (
        <BuiltModelItemComponent key={model.name} model={model} />
    ));

    return (
        <>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Text className='cvat-text-color' strong>Primary</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14} className='cvat-models-list'>
                    <Row type='flex' align='middle' style={{ padding: '10px' }}>
                        <Col span={4} xxl={3}>
                            <Text strong>Framework</Text>
                        </Col>
                        <Col span={6} xxl={7}>
                            <Text strong>Name</Text>
                        </Col>
                        <Col span={5} offset={7}>
                            <Text strong>Labels</Text>
                        </Col>
                    </Row>
                    { items }
                </Col>
            </Row>
        </>
    );
}
