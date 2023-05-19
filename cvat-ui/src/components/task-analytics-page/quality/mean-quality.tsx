// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React from 'react';
import Text from 'antd/lib/typography/Text';
import moment from 'moment';
import { QualityReport, Task, getCore } from 'cvat-core-wrapper';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import Button from 'antd/lib/button';
import { DownloadOutlined } from '@ant-design/icons';
import AnalyticsCard from './analytics-card';

interface Props {
    task: Task;
}

function MeanQuality(props: Props): JSX.Element {
    const { task } = props;
    const tasksReports: QualityReport[] = useSelector((state: CombinedState) => state.analytics.quality.tasksReports);
    const taskReport = tasksReports.find((report: QualityReport) => report.taskId === task.id);
    const reportSummary = taskReport?.summary;
    const meanAccuracy = reportSummary?.accuracy;
    const accuracyRepresentation = !Number.isFinite(meanAccuracy) ? 'N/A' : `${meanAccuracy?.toFixed(1)}%`;
    const tooltip = (
        <div className='cvat-analytics-tooltip-inner'>
            <Text>
                Mean annotation quality consists of:
            </Text>
            <Text>
                Correct annotations:&nbsp;
                {reportSummary?.validCount}
            </Text>
            <Text>
                Task annotations:&nbsp;
                {reportSummary?.dsCount}
            </Text>
            <Text>
                GT annotations:&nbsp;
                {reportSummary?.gtCount}
            </Text>
            <Text>
                Accuracy:&nbsp;
                {accuracyRepresentation}
            </Text>
        </div>
    );

    const dowloadReportButton = (
        <div>
            <Button type='primary' icon={<DownloadOutlined />} className='cvat-analytics-download-report-button'>
                <a
                    href={`${getCore().config.backendAPI}/quality/reports/${taskReport?.id}/data`}
                    download={`quality-report-${taskReport?.id}.json`}
                >
                    Qulity Report
                </a>
            </Button>
            <div className='cvat-analytics-time-hint'>
                <Text type='secondary'>{taskReport?.createdDate ? moment(taskReport?.createdDate).fromNow() : ''}</Text>
            </div>
        </div>

    );
    return (
        <AnalyticsCard
            title='Mean annotation quality'
            className='cvat-task-mean-annotaion-quality'
            value={accuracyRepresentation}
            tooltip={tooltip}
            rightElement={dowloadReportButton}
        />
    );
}

export default React.memo(MeanQuality);
