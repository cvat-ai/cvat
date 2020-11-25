// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import CreateProjectContent from './create-project-content';

export default function CreateProjectPageComponent(): JSX.Element {
    return (
        <Row type='flex' justify='center' align='top' className='cvat-create-task-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'>Create a new project</Text>
                <CreateProjectContent />
            </Col>
        </Row>
    );
}
