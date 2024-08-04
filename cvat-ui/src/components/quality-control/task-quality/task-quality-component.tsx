// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    Job, QualityReport, Task,
} from 'cvat-core-wrapper';
import React from 'react';
import { QualityColors } from 'utils/quality-color';
import PaidFeaturePlaceholder from 'components/paid-feature-placeholder/paid-feature-placeholder';
import { usePlugins } from 'utils/hooks';

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

    const plugins = usePlugins((state) => state.plugins.components.qualityControlPage.tabs.overview, props, {
        task,
        getQualityColor,
    });

    const items: [JSX.Element, number][] = [];
    items.push([(
        <PaidFeaturePlaceholder
            featureName='Quality Control'
            featureDescription='The Quality Control feature enables effortless evaluation of annotation quality by creating a Ground Truth job that works as benchmark.  CVAT automatically compares all task-related jobs to this benchmark, calculating annotation precision to ensure high-quality results.'
            pricingLink='https://cvat.ai/pricing'
        />
    ), 0]);
    items.push(...plugins.map(({ component: Component, weight }, index: number) => (
        [<Component
            key={index}
            targetProps={props}
            targetState={{
                task,
                getQualityColor,
            }}
        />, weight] as [JSX.Element, number]
    )));
    const renderedComponent = items.sort((a, b) => b[1] - a[1])[0][0];

    return (
        <div className='cvat-task-quality-page'>
            {renderedComponent}
        </div>
    );
}

export default React.memo(TaskQualityComponent);
