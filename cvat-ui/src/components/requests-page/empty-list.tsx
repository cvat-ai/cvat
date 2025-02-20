// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';

export default function EmptyListComponent(): JSX.Element {
    return (
        <div className='cvat-empty-requests-list'>
            <Empty description={(
                <>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text strong>No requests made yet ...</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text type='secondary'>Start importing/exporting your resources to see progress here</Text>
                        </Col>
                    </Row>
                </>
            )}
            />
        </div>
    );
}
