// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Tag,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { Model } from 'reducers/interfaces';

interface Props {
    model: Model;
}

export default function BuiltModelItemComponent(props: Props): JSX.Element {
    const { model } = props;

    return (
        <Row className='cvat-models-list-item' type='flex'>
            <Col span={4} xxl={3}>
                <Tag color='orange'>Tensorflow</Tag>
            </Col>
            <Col span={6} xxl={7}>
                <Text className='cvat-text-color'>
                    {model.name}
                </Text>
            </Col>
            <Col span={5} offset={7}>
                <Select
                    showSearch
                    placeholder='Supported labels'
                    style={{ width: '90%' }}
                    value='Supported labels'
                >
                    {model.labels.map(
                        (label): JSX.Element => (
                            <Select.Option key={label}>
                                {label}
                            </Select.Option>
                        ),
                    )}
                </Select>
            </Col>
            <Col span={2} />
        </Row>
    );
}
