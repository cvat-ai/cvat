// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import ModelForm from './model-form';

function CreateModelPage(): JSX.Element {
    return (
        <div className='cvat-create-model-page'>
            <Row justify='center' align='middle'>
                <Col>
                    <Text className='cvat-title'>Add a model</Text>
                </Col>
            </Row>
            <Row justify='center' align='top'>
                <Col md={20} lg={16} xl={14} xxl={9}>
                    <ModelForm />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(CreateModelPage);
