// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import { LeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useHistory } from 'react-router';
import SetupWebhookContent from './setup-webhook-content';

function CreateWebhookPage(): JSX.Element {
    const history = useHistory();

    return (
        <div className='cvat-create-webhook-page'>
            <Row justify='center' align='middle'>
                <Col md={20} lg={16} xl={14} xxl={9}>
                    <Button className='cvat-webhooks-go-back' onClick={() => history.goBack()} type='link' size='large'>
                        <LeftOutlined />
                        Back to webhooks
                    </Button>
                </Col>
            </Row>
            <Row justify='center' align='top' className='cvat-create-webhook-form-wrapper'>
                <Col md={20} lg={16} xl={14} xxl={9}>
                    <SetupWebhookContent />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(CreateWebhookPage);
