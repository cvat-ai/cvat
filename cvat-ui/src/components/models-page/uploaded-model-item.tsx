// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Tag,
    Select,
    Menu,
    Dropdown,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import moment from 'moment';

import { MenuIcon } from 'icons';
import { Model } from 'reducers/interfaces';

interface Props {
    model: Model;
    owner: any;
    onDelete(): void;
}

export default function UploadedModelItem(props: Props): JSX.Element {
    const {
        model,
        owner,
        onDelete,
    } = props;

    return (
        <Row className='cvat-models-list-item' type='flex'>
            <Col span={4} xxl={3}>
                <Tag color='purple'>OpenVINO</Tag>
            </Col>
            <Col span={5} xxl={7}>
                <Text className='cvat-text-color'>
                    {model.name}
                </Text>
            </Col>
            <Col span={3}>
                <Text className='cvat-text-color'>
                    {owner ? owner.username : 'undefined'}
                </Text>
            </Col>
            <Col span={4}>
                <Text className='cvat-text-color'>
                    {moment(model.uploadDate).format('MMMM Do YYYY')}
                </Text>
            </Col>
            <Col span={5}>
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
            <Col span={3} xxl={2}>
                <Text className='cvat-text-color'>Actions</Text>
                <Dropdown overlay={
                    (
                        <Menu className='cvat-task-item-menu'>
                            <Menu.Item
                                onClick={(): void => {
                                    onDelete();
                                }}
                                key='delete'
                            >
                                    Delete
                            </Menu.Item>
                        </Menu>
                    )
                }
                >
                    <Icon className='cvat-menu-icon' component={MenuIcon} />
                </Dropdown>
            </Col>
        </Row>
    );
}
