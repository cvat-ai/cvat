// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import { LeftOutlined } from '@ant-design/icons';
import { useHistory, useParams } from 'react-router';
import { CombinedState } from 'reducers';
import { getCore } from 'cvat-core-wrapper';
import SetupWebhookContent from './setup-webhook-content';

interface ParamType {
    id: string;
}

const core = getCore();

function UpdateWebhookPage(): JSX.Element {
    const id = +useParams<ParamType>().id;
    const history = useHistory();
    const [webhook, setWebhook] = React.useState<CombinedState['webhooks']['current'][number] | null>(null);
    const webhooks = useSelector((state: CombinedState) => state.webhooks.current);

    useEffect(() => {
        const fetchedWebhook = webhooks.find((_webhook) => _webhook.id === id) ?? null;
        if (!fetchedWebhook) {
            core.webhooks.get({ id }).then(([webhookInstance]) => {
                if (webhookInstance) {
                    setWebhook(webhookInstance);
                }
            }).catch((error: unknown) => {
                notification.error({
                    message: 'Failed to fetch the webhook',
                    description: error instanceof Error ? error.message : 'Unknown error',
                });
            });
        } else {
            setWebhook(fetchedWebhook);
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
