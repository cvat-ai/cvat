// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    Job, QualityReport, Task,
} from 'cvat-core-wrapper';
import React from 'react';
import { QualityColors } from 'utils/quality-color';
import PaidFeaturePlaceholder from 'components/paid-feature-placeholder/paid-feature-placeholder';

interface Props {
    task: Task;
    taskReport: QualityReport | null;
    jobsReports: QualityReport[];
    reportRefreshingStatus: string | null;
    onJobUpdate: (job: Job, data: Parameters<Job['save']>[0]) => void;
    onCreateReport: () => void;
    getQualityColor: (value?: number) => QualityColors;
}

function TaskQualityComponent(props: Props): JSX.Element {
    const {
        task, onJobUpdate, taskReport, jobsReports, reportRefreshingStatus, onCreateReport, getQualityColor,
    } = props;

    return (
        <div className='cvat-task-quality-page'>
            <PaidFeaturePlaceholder
                featureName='Quality Control'
                featureDescription='The Quality Control feature enables effortless evaluation of annotation quality by creating a Ground Truth job that works as benchmark.  CVAT automatically compares all task-related jobs to this benchmark, calculating annotation precision to ensure high-quality results.'
                pricingLink='https://cvat.ai/pricing'
            />
        </div>
    );
}

export default React.memo(TaskQualityComponent);
