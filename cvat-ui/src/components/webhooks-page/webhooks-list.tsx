// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import { useSelector } from 'react-redux';
import { CombinedState, SelectedResourceType } from 'reducers';
import BulkWrapper from 'components/bulk-wrapper';
import WebhookItem from './webhook-item';

function WebhooksList(): JSX.Element {
    const webhooks = useSelector((state: CombinedState) => state.webhooks.current);

    return (
        <Row justify='center' align='middle' className='cvat-resource-list-wrapper'>
            <Col className='cvat-webhooks-list' md={22} lg={18} xl={16} xxl={14}>
                <BulkWrapper
                    currentResourceIds={webhooks.map((webhook) => webhook.id)}
                    resourceType={SelectedResourceType.WEBHOOKS}
                >
                    {(selectProps) => (
                        webhooks.map((webhook, idx) => (
                            <WebhookItem
                                key={webhook.id}
                                webhookInstance={webhook}
                                {...selectProps(webhook.id, idx)}
                            />
                        ))
                    )}
                </BulkWrapper>
            </Col>
        </Row>
    );
}

export default React.memo(WebhooksList);
