// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import { QualityReport, getCore } from 'cvat-core-wrapper';
import { useIsMounted } from 'utils/hooks';
import AnalyticsCard from '../views/analytics-card';
import { percent, clampValue } from '../utils/text-formatting';

const core = getCore();

interface Props {
    projectId: number;
    projectReport: QualityReport | null;
}

function CoverageSummary(props: Props): JSX.Element {
    const { projectId, projectReport } = props;

    const [gtFramesCount, setGtFramesCount] = useState<string | number>('N/A');
    const [totalFramesCount, setTotalFramesCount] = useState<string | number>('N/A');
    const [tasksCount, setTaskCount] = useState<number>(0);
    const [taskReportsCount, setTaskReportsCount] = useState<number>(0);
    const isMounted = useIsMounted();

    useEffect(() => {
        core.tasks.get({ projectId })
            .then((results: any) => {
                if (isMounted()) {
                    setTaskCount(results.count);
                }
            }).catch((error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: error.toString(),
                        message: "Couldn't fetch tasks count",
                    });
                }
            });
    }, [projectId]);

    useEffect(() => {
        if (!projectReport) {
            return;
        }

        core.analytics.quality.reports({ target: 'task', parentId: projectReport.id })
            .then((results: any) => {
                if (isMounted()) {
                    setTaskReportsCount(results.count);
                }
            })
            .catch((error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: error.toString(),
                        message: "Couldn't fetch project quality reports",
                        className: 'cvat-notification-notice-get-reports-error',
                    });
                }
            });

        const reportSummary = projectReport.summary;
        setGtFramesCount(
            `${clampValue(reportSummary?.frameCount)}${
                reportSummary?.frameCount ?
                    ` (${percent(reportSummary?.frameCount, reportSummary?.totalFrames)})` :
                    ''}`,
        );

        setTotalFramesCount(reportSummary?.totalFrames);
    }, [projectId, projectReport?.id]);

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
