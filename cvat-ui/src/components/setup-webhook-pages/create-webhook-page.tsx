// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import { LeftOutlined } from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router';
import SetupWebhookContent from './setup-webhook-content';

function CreateWebhookPage(): JSX.Element {
    const history = useHistory();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    let defaultProjectId : number | null = null;
    if (params.get('projectId')?.match(/^[1-9]+[0-9]*$/)) {
        defaultProjectId = +(params.get('projectId') as string);
    }

    return (
        <div className='cvat-create-webhook-page'>
            <Row justify='center' align='middle'>
                <Col md={20} lg={16} xl={14} xxl={9}>
                    <Button
                        className='cvat-webhooks-go-back'
                        onClick={() => (defaultProjectId ?
                            history.push(`/projects/${defaultProjectId}/webhooks`) :
                            history.push('/organization/webhooks'))}
                        type='link'
                        size='large'
                    >
                        <LeftOutlined />
                        Back to webhooks
                    </Button>
                </Col>
            </Row>
            <Row justify='center' align='top' className='cvat-create-webhook-form-wrapper'>
                <Col md={20} lg={16} xl={14} xxl={9}>
                    <SetupWebhookContent defaultProjectId={defaultProjectId} />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(CreateWebhookPage);
