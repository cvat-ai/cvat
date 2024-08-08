// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';

import ConsensusReport, { ConsensusSummary } from 'cvat-core/src/consensus-report';
import AnalyticsCard from '../views/analytics-card';
import { clampValue } from '../utils/text-formatting';

interface Props {
    taskReport: ConsensusReport | null;
}

interface ConflictTooltipProps {
    reportSummary?: ConsensusSummary;
}

export function ConflictsTooltip(props: ConflictTooltipProps): JSX.Element {
    const { reportSummary } = props;
    return (
        <Row className='cvat-analytics-tooltip-conflicts-inner'>
            <Col span={12}>
                <Text>Conflicts:</Text>
                <Text>
                    No matching item:&nbsp;
                    {reportSummary?.conflictsByType.no_matching_item || 0}
                </Text>
                <Text>
                    Failed attribute voting:&nbsp;
                    {reportSummary?.conflictsByType.failed_attribute_voting || 0}
                </Text>
                <Text>
                    No matching annotation:&nbsp;
                    {reportSummary?.conflictsByType.no_matching_annotation || 0}
                </Text>
                <Text>
                    Annotation too close:&nbsp;
                    {reportSummary?.conflictsByType.annotation_too_close || 0}
                </Text>
                <Text>
                    Wrong group:&nbsp;
                    {reportSummary?.conflictsByType.wrong_group || 0}
                </Text>
                <Text>
                    Failed label voting:&nbsp;
                    {reportSummary?.conflictsByType.failed_label_voting || 0}
                </Text>
            </Col>
        </Row>
    );
}

function ConsensusConflicts(props: Props): JSX.Element {
    const { taskReport } = props;
    let conflictsRepresentation: string | number = 'N/A';
    let reportSummary;
    if (taskReport) {
        reportSummary = taskReport.summary;
        conflictsRepresentation = clampValue(reportSummary?.conflictCount);
    }

    return (
        <AnalyticsCard
            title='Consensus Conflicts'
            className='cvat-task-gt-conflicts'
            value={conflictsRepresentation}
            tooltip={<ConflictsTooltip reportSummary={reportSummary} />}
            size={12}
        />
    );
}

export default React.memo(ConsensusConflicts);
