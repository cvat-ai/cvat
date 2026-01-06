// Copyright (C) CVAT.ai Corporation
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
        <div className='cvat-empty-webhooks-list'>
            <Empty description={!query.filter && !query.search ? (
                <Row justify='center' align='middle'>
                    <Col>
                        <Text strong>暂无 Webhook...</Text>
                    </Col>
                </Row>
            ) : (<Text>没有找到匹配的结果</Text>)}
            />
        </div>
    );
}

export default React.memo(EmptyWebhooksListComponent);
