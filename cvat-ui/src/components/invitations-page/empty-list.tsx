// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';

function EmptyListComponent(): JSX.Element {
    return (
        <div className='cvat-empty-invitations-list'>
            <Empty description={(
                <Row justify='center' align='middle'>
                    <Col>
                        <Text strong>您没有待处理的邀请</Text>
                    </Col>
                </Row>
            )}
            />
        </div>
    );
}

export default React.memo(EmptyListComponent);
