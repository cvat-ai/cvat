// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import Text from 'antd/lib/typography/Text';
import { QualityReport, getCore } from 'cvat-core-wrapper';
import { useStateIfMounted } from 'utils/hooks';
import AnalyticsCard from '../views/analytics-card';
import { percent, clampValue } from '../utils/text-formatting';

const core = getCore();

interface Props {
    tasks: Awaited<ReturnType<typeof core['tasks']['get']>>;
    reports: QualityReport[];
    projectReport: QualityReport | null;
}

function CoverageSummary(props: Props): JSX.Element {
    const { tasks, reports, projectReport } = props;

    const [gtFramesCount, setGtFramesCount] = useStateIfMounted<string | number>('N/A');
    const [totalFramesCount, setTotalFramesCount] = useStateIfMounted<string | number>('N/A');
    const [tasksCount, setTaskCount] = useStateIfMounted<number>(0);
    const [taskReportsCount, setTaskReportsCount] = useStateIfMounted<number>(0);

    useEffect(() => {
        setTaskCount(tasks.count);
        setTaskReportsCount(reports.length);
    }, []);

    useEffect(() => {
        if (!projectReport) {
            return;
        }

        const reportSummary = projectReport.summary;
        setGtFramesCount(
            `${clampValue(reportSummary?.frameCount)}${
                reportSummary?.frameCount ?
                    ` (${percent(reportSummary?.frameCount, reportSummary?.totalFrames)})` :
                    ''}`,
        );

        setTotalFramesCount(reportSummary?.totalFrames);
    }, [projectReport?.id]);

    const bottomElement = (
        <>
            <Text type='secondary'>{`Frames with GT: ${gtFramesCount}`}</Text>
            <Text type='secondary'>{`, total frames: ${totalFramesCount}`}</Text>
        </>
    );

    return (
        <AnalyticsCard
            title='Tasks with GT'
            className='cvat-project-coverage-summary'
            value={
                clampValue(taskReportsCount) +
                (taskReportsCount ? ` (${percent(taskReportsCount, tasksCount, 0)})` : '')
            }
            size={12}
            bottomElement={bottomElement}
        />
    );
}

export default React.memo(CoverageSummary);
