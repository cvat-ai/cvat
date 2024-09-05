// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    TargetMetric,
    Task,
} from 'cvat-core-wrapper';
import React from 'react';
import { QualityColors } from 'utils/quality';
import PaidFeaturePlaceholder from 'components/paid-feature-placeholder/paid-feature-placeholder';
import { usePlugins } from 'utils/hooks';
import config from 'config';

interface Props {
    task: Task;
    getQualityColor: (value?: number) => QualityColors;
    targetMetric: TargetMetric;
}

function TaskQualityComponent(props: Readonly<Props>): JSX.Element {
    const {
        task, getQualityColor, targetMetric,
    } = props;

    const { PAID_PLACEHOLDER_CONFIG: { features: { qualityControl: featureDescription } } } = config;

    const plugins = usePlugins((state) => state.plugins.components.qualityControlPage.tabs.overview, props, {
        task,
        getQualityColor,
        targetMetric,
    });

    const items: [JSX.Element, number][] = [];

    items.push(...plugins.map(({ component: Component, weight }, index: number) => (
        [<Component
            key={index}
            targetProps={props}
            targetState={{
                task,
                getQualityColor,
                targetMetric,
            }}
        />, weight] as [JSX.Element, number]
    )));

    const renderedComponent = items.sort((a, b) => b[1] - a[1])[0][0];

    return (
        <div className='cvat-task-quality-page'>
            <PaidFeaturePlaceholder featureDescription={featureDescription} />
            {renderedComponent}
        </div>
    );
}

export default React.memo(TaskQualityComponent);
