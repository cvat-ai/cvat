// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';

import { ConsensusReport, getCore } from 'cvat-core-wrapper';
import { toRepresentation } from 'utils/consensus';
import AnalyticsCard from '../views/analytics-card';

interface Props {
    taskID: number;
    taskReport: ConsensusReport | null;
}

function MeanQuality(props: Props): JSX.Element {
    const { taskID, taskReport } = props;
    const reportSummary = taskReport?.summary;

    const tooltip = (
        <div className='cvat-analytics-tooltip-inner'>
            <Text>
                Conflicting annotations:&nbsp;
                {reportSummary?.conflictCount || 0}
            </Text>
        </div>
    );

    const downloadReportButton = (
        <div className='cvat-quality-summary-controls'>
            <Row>
                <Col>
                    {
                        taskReport?.id ? (
                            <Button type='primary' icon={<DownloadOutlined />} className='cvat-analytics-download-report-button'>
                                <a
                                    href={
                                        `${getCore().config.backendAPI}/consensus/reports/${taskReport?.id}/data`
                                    }
                                    download={`consensus-report-task_${taskID}-${taskReport?.id}.json`}
                                >
                                    Consensus Report
                                </a>
                            </Button>
                        ) : null
                    }
                </Col>
            </Row>
        </div>
    );

    return (
        <AnalyticsCard
            title='Mean consensus score'
            className='cvat-task-mean-annotation-quality'
            value={toRepresentation(taskReport?.consensus_score)}
            tooltip={tooltip}
            rightElement={downloadReportButton}
        />
    );
}

export default React.memo(MeanQuality);
