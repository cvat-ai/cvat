// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React, { useEffect, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import { QualityReport, QualitySummary } from 'cvat-core-wrapper';
import { Col, Row } from 'antd/lib/grid';
import AnalyticsCard from './analytics-card';
import { percent, clampValue, toRepresentation } from './common';

interface Props {
    projectId: number;
    projectReport: QualityReport | null;
}

interface ConflictTooltipProps {
    reportSummary?: QualitySummary;
}

export function ConflictsTooltip(props: ConflictTooltipProps): JSX.Element {
    const { reportSummary } = props;
    return (
        <>
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
                <Text>
                    Total frames:&nbsp;
                    {reportSummary?.totalFrames || 'N/A'}
                </Text>
            </Row>
        </>
    );
}

function ConflictsSummary(props: Props): JSX.Element {
    const { projectId, projectReport } = props;

    const [epfValue, setEpfValue] = useState<string | number>('N/A');
    useEffect(() => {
        if (projectReport && projectReport.summary) {
            const reportSummary = projectReport?.summary;
            setEpfValue(toRepresentation(reportSummary.errorCount / reportSummary.frameCount, false));
        }
    }, [projectReport]);

    const reportSummary = projectReport?.summary;
    const bottomElement = (
        <>
            <Text type='secondary'>
                Frames with errors:
                {' '}
                {clampValue(reportSummary?.framesWithErrors)}
                { reportSummary?.framesWithErrors ?
                    ` (${percent(reportSummary?.framesWithErrors, reportSummary?.totalFrames)})` : '' }
            </Text>
        </>
    );

    return (
        <AnalyticsCard
            title='Errors per frame'
            className='cvat-project-gt-conflicts-summary'
            value={epfValue}
            tooltip={<ConflictsTooltip reportSummary={reportSummary} />}
            size={12}
            bottomElement={bottomElement}
        />
    );
}

export default React.memo(ConflictsSummary);
