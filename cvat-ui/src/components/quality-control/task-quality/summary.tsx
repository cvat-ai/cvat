// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/es/grid';
import Text from 'antd/lib/typography/Text';
import AnalyticsCard from 'components/analytics-page/views/analytics-card';

export interface Props {
    excludedCount: number;
    totalCount: number;
    activeCount: number;
}

export default function SummaryComponent(props: Readonly<Props>): JSX.Element {
    const { excludedCount, totalCount, activeCount } = props;

    const reportInfo = (
        <Row>
            <Col span={10} className='cvat-allocation-summary'>
                <Row>
                    <Col span={12} className='cvat-allocation-summary-excluded'>
                        <Text>
                            Excluded count:
                            {' '}
                            <Text strong>{excludedCount}</Text>
                        </Text>
                    </Col>
                    <Col span={12} className='cvat-allocation-summary-total'>
                        <Text>
                            Total count:
                            {' '}
                            <Text strong>{totalCount}</Text>
                        </Text>
                    </Col>
                </Row>
                <Row>
                    <Col span={12} className='cvat-allocation-summary-active'>
                        <Text>
                            Active count:
                            {' '}
                            <Text strong>{activeCount}</Text>
                        </Text>
                    </Col>
                </Row>
            </Col>
        </Row>
    );

    return (
        <AnalyticsCard
            title='Summary'
            className='cvat-annotations-quality-allocation-table-summary'
            bottomElement={reportInfo}
            size={{ leftElementSize: 24 }}
        />
    );
}
