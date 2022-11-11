// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import { LeftOutlined } from '@ant-design/icons';
import { useHistory, useParams } from 'react-router';
import { CombinedState } from 'reducers';
import { useDispatch, useSelector } from 'react-redux';
import { getWebhooksAsync } from 'actions/webhooks-actions';
import SetupWebhookContent from './setup-webhook-content';

interface ParamType {
    id: string;
}

function UpdateWebhookPage(): JSX.Element {
    const id = +useParams<ParamType>().id;
    const history = useHistory();
    const dispatch = useDispatch();
    const webhooks = useSelector((state: CombinedState) => state.webhooks.current);
    const [webhook] = webhooks.filter((_webhook) => _webhook.id === id);

    useEffect(() => {
        if (!webhook) {
            dispatch(getWebhooksAsync({ id }));
        }
    }, []);

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
                    <SetupWebhookContent webhook={webhook} defaultProjectId={webhook?.projectID || null} />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(UpdateWebhookPage);
