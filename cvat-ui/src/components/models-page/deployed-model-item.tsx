// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Tag from 'antd/lib/tag';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import { Model } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    model: Model;
}

export default function DeployedModelItem(props: Props): JSX.Element {
    const { model } = props;

    return (
        <Row className='cvat-models-list-item'>
            <Col span={3}>
                <Tag color='purple'>{model.framework}</Tag>
            </Col>
            <Col span={3}>
                <CVATTooltip overlay={model.name}>
                    <Text className='cvat-text-color'>{model.name}</Text>
                </CVATTooltip>
            </Col>
            <Col span={3} offset={1}>
                <Tag color='orange'>{model.type}</Tag>
            </Col>
            <Col span={8}>
                <CVATTooltip overlay={model.description}>
                    <Text style={{ whiteSpace: 'normal', height: 'auto' }}>{model.description}</Text>
                </CVATTooltip>
            </Col>
            <Col span={5} offset={1}>
                <Select showSearch placeholder='Supported labels' style={{ width: '90%' }} value='Supported labels'>
                    {model.labels.map(
                        (label): JSX.Element => (
                            <Select.Option value={label} key={label}>
                                {label}
                            </Select.Option>
                        ),
                    )}
                </Select>
            </Col>
        </Row>
    );
}
