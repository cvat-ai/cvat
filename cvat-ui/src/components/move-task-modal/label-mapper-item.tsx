// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Tag from 'antd/lib/tag';
import Select from 'antd/lib/select';
import Checkbox from 'antd/lib/checkbox';
import { ArrowRightOutlined } from '@ant-design/icons';

export interface LabelMapperItemValue {
    labelId: number;
    newLabelId: number | null;
    clearAtrributes: boolean;
}

export interface LabelMapperItemProps {
    label: any;
    projectLabels?: any[];
    value: LabelMapperItemValue;
    onChange: (value: LabelMapperItemValue) => void;
}

export default function LabelMapperItem(props: LabelMapperItemProps): JSX.Element {
    const {
        label, value, onChange, projectLabels,
    } = props;

    return (
        <Row className='cvat-move-task-label-mapper-item' align='middle'>
            <Col span={6}>
                <Tag color={label.color}>{label.name}</Tag>
                <ArrowRightOutlined />
            </Col>
            <Col>
                <Select
                    disabled={typeof projectLabels === 'undefined'}
                    onChange={(_value) =>
                        onChange({
                            ...value,
                            newLabelId: +_value,
                        })}
                >
                    <Select.Option value={-1}>
                        <i>Create</i>
                    </Select.Option>
                    <Select.Option value={-2}>
                        <i>Delete</i>
                    </Select.Option>
                    {projectLabels?.map((_label) => (
                        <Select.Option key={_label.id} value={`${_label.id}`}>
                            {_label.name}
                        </Select.Option>
                    ))}
                </Select>
            </Col>
            <Col>
                <Checkbox
                    checked={value.clearAtrributes}
                    disabled={(value.newLabelId || 0) <= 0}
                    onChange={(_value) =>
                        onChange({
                            ...value,
                            clearAtrributes: _value.target.checked,
                        })}
                >
                    Clear attributes
                </Checkbox>
            </Col>
        </Row>
    );
}
