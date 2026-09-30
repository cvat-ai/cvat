// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import { useSelector } from 'react-redux';
import { CombinedState, SelectedResourceType } from 'reducers';
import BulkWrapper from 'components/bulk-wrapper';
import dimensions from 'utils/dimensions';
import { type WebhookEvent } from 'cvat-core-wrapper';
import WebhookItem from './webhook-item';

interface Props {
    webhookEvents: WebhookEvent[];
}

function WebhooksList(props: Readonly<Props>): JSX.Element {
    const { webhookEvents } = props;
    const webhooks = useSelector((state: CombinedState) => state.webhooks.current);

    return (
        <Row justify='center' align='middle' className='cvat-resource-list-wrapper'>
            <Col className='cvat-webhooks-list' {...dimensions}>
                <BulkWrapper
                    currentResourceIds={webhooks.map((webhook) => webhook.id)}
                    resourceType={SelectedResourceType.WEBHOOKS}
                >
                    {(selectProps) => (
                        webhooks.map((webhook, idx) => (
                            <WebhookItem
                                key={webhook.id}
                                webhookInstance={webhook}
                                webhookEvents={webhookEvents}
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
