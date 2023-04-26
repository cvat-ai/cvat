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
import { getQualityColor } from 'utils/quality-color';
import { QualityReport, Task } from 'cvat-core-wrapper';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

interface Props {
    task: Task;
}

function MeanQuality(props: Props): JSX.Element {
    const { task } = props;

    const tasksReports: QualityReport[] = useSelector((state: CombinedState) => state.analytics.quality.tasksReports);
    const taskReport = tasksReports.find((report: QualityReport) => report.taskId === task.id);
    const meanAccuracy = taskReport?.summary.accuracy;
    return (
        <Col span={8}>
            <Card className='cvat-task-mean-annotaion-quality'>
                <Statistic
                    title='Mean annotaion quality'
                    value={meanAccuracy || 'N/A'}
                    precision={2}
                    valueStyle={{ color: getQualityColor(meanAccuracy) }}
                    suffix={meanAccuracy ? '%' : ''}
                />
                <div className='cvat-analytics-time-hint'>
                    <Text type='secondary'>{taskReport?.createdDate ? moment(taskReport?.createdDate).fromNow() : ''}</Text>
                </div>
            </Card>
        </Col>
    );
}

export default React.memo(MeanQuality);
