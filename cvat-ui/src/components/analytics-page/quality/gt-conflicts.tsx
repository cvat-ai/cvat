// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';

import { QualityReport, QualitySummary } from 'cvat-core-wrapper';
import AnalyticsCard from '../views/analytics-card';
import { percent, clampValue } from '../utils/text-formatting';

interface Props {
    taskReport: QualityReport | null;
}

interface ConflictTooltipProps {
    reportSummary?: QualitySummary;
}

export function ConflictsTooltip(props: ConflictTooltipProps): JSX.Element {
    const { reportSummary } = props;
    return (
        <Row className='cvat-analytics-tooltip-conflicts-inner'>
            <Col span={12}>
                <Text>
                    Warnings:
                </Text>
                <Text>
                    Low overlap:&nbsp;
                    {reportSummary?.conflictsByType.lowOverlap || 0}
                </Text>
                <Text>
                    Mismatching direction:&nbsp;
                    {reportSummary?.conflictsByType.mismatchingDirection || 0}
                </Text>
                <Text>
                    Mismatching attributes:&nbsp;
                    {reportSummary?.conflictsByType.mismatchingAttributes || 0}
                </Text>
                <Text>
                    Mismatching groups:&nbsp;
                    {reportSummary?.conflictsByType.mismatchingGroups || 0}
                </Text>
                <Text>
                    Covered annotation:&nbsp;
                    {reportSummary?.conflictsByType.coveredAnnotation || 0}
                </Text>
            </Col>
            <Col span={12}>
                <Text>
                    Errors:
                </Text>
                <Text>
                    Missing annotations:&nbsp;
                    {reportSummary?.conflictsByType.missingAnnotations || 0}
                </Text>
                <Text>
                    Extra annotations:&nbsp;
                    {reportSummary?.conflictsByType.extraAnnotations || 0}
                </Text>
                <Text>
                    Mismatching label:&nbsp;
                    {reportSummary?.conflictsByType.mismatchingLabel || 0}
                </Text>
            </Col>
        </Row>
    );
}

function GTConflicts(props: Props): JSX.Element {
    const { taskReport } = props;
    let conflictsRepresentation: string | number = 'N/A';
    let reportSummary;
    if (taskReport) {
        reportSummary = taskReport.summary;
        conflictsRepresentation = clampValue(reportSummary?.conflictCount);
    }

    const bottomElement = (
        <>
            <Text type='secondary'>
                Errors:
                {' '}
                {clampValue(reportSummary?.errorCount)}
                {reportSummary?.errorCount ?
                    ` (${percent(reportSummary?.errorCount, reportSummary?.conflictCount)})` : ''}
            </Text>
            <Text type='secondary'>
                {', '}
                Warnings:
                {' '}
                {clampValue(reportSummary?.warningCount)}
                { reportSummary?.warningCount ?
                    ` (${percent(reportSummary?.warningCount, reportSummary?.conflictCount)})` : '' }
            </Text>
        </>
    );

    return (
        <AnalyticsCard
            title='GT Conflicts'
            className='cvat-task-gt-conflicts'
            value={conflictsRepresentation}
            tooltip={<ConflictsTooltip reportSummary={reportSummary} />}
            size={12}
            bottomElement={bottomElement}
        />
    );
}

export default React.memo(GTConflicts);
