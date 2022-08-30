// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import Empty from 'antd/lib/empty';
import { WebhooksQuery } from 'reducers';

interface Props {
    query: WebhooksQuery;
}

function EmptyWebhooksListComponent(props: Props): JSX.Element {
    const { query } = props;

    return (
        // TODO: add empty search after implementing queries
        <div className='cvat-empty-webhooks-list'>
            <Empty description={(
                <>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text strong>No webhooks created yet ...</Text>
                        </Col>
                    </Row>
                </>
            )}
            />
        </div>
    );
}

export default React.memo(EmptyWebhooksListComponent);
