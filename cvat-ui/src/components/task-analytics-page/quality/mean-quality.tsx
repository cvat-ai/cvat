// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Col } from 'antd/lib/grid';
import Statistic from 'antd/lib/statistic';
import Card from 'antd/lib/card';
import moment from 'moment';
import { getColor } from 'utils/quality-color';

function MeanQuality(): JSX.Element {
    const data = {
        lastUpdatedTime: moment().fromNow(),
        summary: {
            meanAccuracy: 85,
        },
    };
    return (
        <Col span={8}>
            <Card className='cvat-task-mean-annotaion-quality'>
                <Statistic
                    title='Mean annotaion quality'
                    value={data.summary.meanAccuracy}
                    precision={2}
                    valueStyle={{ color: getColor(data.summary.meanAccuracy) }}
                    suffix='%'
                />
                <div className='cvat-analytics-time-hint'>
                    <Text>{data.lastUpdatedTime}</Text>
                </div>
            </Card>
        </Col>
    );
}

export default React.memo(MeanQuality);
