// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Tag from 'antd/lib/tag';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import { CloseOutlined } from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import { deleteModelAsync } from 'actions/models-actions';
import { MLModel } from 'cvat-core-wrapper';

interface Props {
    model: MLModel;
}

export default function DeployedModelItem(props: Props): JSX.Element {
    const { model } = props;
    const dispatch = useDispatch();
    const [isRemoved, setIsRemoved] = useState(false);

    return (
        <Row className={`cvat-models-list-item ${isRemoved ? 'cvat-models-list-item-removed' : ''}`}>
            <Col span={2}>
                <Tag color='blue'>{model.provider}</Tag>
            </Col>
            <Col span={3}>
                <CVATTooltip overlay={model.name}>
                    <Text className='cvat-text-color'>{model.name}</Text>
                </CVATTooltip>
            </Col>
            <Col span={2} offset={1}>
                <Tag color='purple'>{model.owner}</Tag>
            </Col>
            <Col span={3}>
                <Tag color='orange'>{model.type}</Tag>
            </Col>
            <Col span={8}>
                <CVATTooltip overlay={model.description}>
                    <Text style={{ whiteSpace: 'normal', height: 'auto' }}>{model.description}</Text>
                </CVATTooltip>
            </Col>
            <Col span={5}>
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
            {
                model.deletable ? (
                    <Col
                        className='cvat-model-delete'
                        onClick={() => {
                            Modal.confirm({
                                title: 'Are you sure you want to remove this model?',
                                content: 'You will not be able to use it anymore',
                                className: 'cvat-modal-confirm-remove-webhook',
                                onOk: () => {
                                    dispatch(deleteModelAsync(model)).then(() => {
                                        setIsRemoved(true);
                                    });
                                },
                            });
                        }}
                    >
                        <CloseOutlined />
                    </Col>
                ) : null
            }
        </Row>
    );
}
