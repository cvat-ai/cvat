// Copyright (C) 2023 CVAT.ai Corporation
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
                        <Text strong>You do not have active invitations</Text>
                    </Col>
                </Row>
            )}
            />
        </div>
    );
}

export default React.memo(EmptyListComponent);
