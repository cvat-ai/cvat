// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React from 'react';
import Text from 'antd/lib/typography/Text';
import moment from 'moment';
import { QualityReport, getCore } from 'cvat-core-wrapper';
import Button from 'antd/lib/button';
import { DownloadOutlined, MoreOutlined } from '@ant-design/icons';
import AnalyticsCard from './analytics-card';
import { toRepresentation } from '../../../utils/quality-common';

interface Props {
    projectId: number;
    projectReport: QualityReport | null;
    setQualitySettingsVisible: Function;
}

function QualitySummary(props: Props): JSX.Element {
    const { projectId, projectReport, setQualitySettingsVisible } = props;
    const reportSummary = projectReport?.summary;

    const tooltip = (
        <div className='cvat-analytics-tooltip-inner'>
            <Text>
                Mean annotation quality consists of:
            </Text>
            <Text>
                Correct annotations:&nbsp;
                {reportSummary?.validCount || 0}
            </Text>
            <Text>
                Project annotations:&nbsp;
                {reportSummary?.dsCount || 0}
            </Text>
            <Text>
                GT annotations:&nbsp;
                {reportSummary?.gtCount || 0}
            </Text>
            <Text>
                Weighted avg. Accuracy*:&nbsp;
                {toRepresentation(reportSummary?.accuracy)}
            </Text>
            <Text>
                Weighted avg. Precision*:&nbsp;
                {toRepresentation(reportSummary?.precision)}
            </Text>
            <Text>
                Weighted avg. Recall*:&nbsp;
                {toRepresentation(reportSummary?.recall)}
            </Text>
            <Text>
                * Weights correspond to task sizes in the whole project
            </Text>
        </div>
    );

    const downloadReportButton = (
        <div>
            {
                projectReport ? (
                    <>
                        <Button type='primary' icon={<DownloadOutlined />} className='cvat-analytics-download-report-button'>
                            <a
                                href={`${getCore().config.backendAPI}/quality/reports/${projectReport?.id}/data`}
                                download={`quality-report-project_${projectId}-${projectReport?.id}.json`}
                            >
                                Quality Report
                            </a>
                        </Button>
                        <MoreOutlined
                            className='cvat-quality-settings-switch'
                            onClick={() => setQualitySettingsVisible(true)}
                        />
                        <div className='cvat-analytics-time-hint'>
                            <Text type='secondary'>{projectReport?.createdDate ? moment(projectReport?.createdDate).fromNow() : ''}</Text>
                        </div>
                    </>
                ) : null
            }
        </div>

    );
    return (
        <AnalyticsCard
            title='Mean annotation quality'
            className='cvat-project-mean-annotation-quality'
            value={toRepresentation(reportSummary?.accuracy)}
            tooltip={tooltip}
            rightElement={downloadReportButton}
        />
    );
}

export default React.memo(QualitySummary);
