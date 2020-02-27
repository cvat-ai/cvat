// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import CreateTaskContent, { CreateTaskData } from './create-task-content';

interface Props {
    onCreate: (data: CreateTaskData) => void;
    status: string;
    installedGit: boolean;
}

export default function CreateTaskPage(props: Props): JSX.Element {
    const {
        status,
        onCreate,
        installedGit,
    } = props;

    return (
        <Row type='flex' justify='center' align='top' className='cvat-create-task-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'>Create a new task</Text>
                <CreateTaskContent
                    status={status}
                    onCreate={onCreate}
                    installedGit={installedGit}
                />
            </Col>
        </Row>
    );
}
