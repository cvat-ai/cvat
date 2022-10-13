// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import WebhookItem from './webhook-item';

function WebhooksList(): JSX.Element {
    const webhooks = useSelector((state: CombinedState) => state.webhooks.current);
    return (
        <Row justify='center' align='middle'>
            <Col className='cvat-webhooks-list' md={22} lg={18} xl={16} xxl={14}>
                {webhooks.map(
                    (webhook: any): JSX.Element => (
                        <WebhookItem
                            key={webhook.id}
                            webhookInstance={webhook}
                        />
                    ),
                )}
            </Col>
        </Row>
    );
}

export default React.memo(WebhooksList);
