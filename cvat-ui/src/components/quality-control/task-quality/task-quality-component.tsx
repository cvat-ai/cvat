// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { TargetMetric, Task } from 'cvat-core-wrapper';
import { QualityColors } from 'utils/quality';
import CustomizableComponents from 'components/customizable-components';

interface Props {
    task: Task;
    getQualityColor: (value?: number) => QualityColors;
    targetMetric: TargetMetric;
}

function TaskQualityComponent(props: Readonly<Props>): JSX.Element {
    const { task, getQualityColor, targetMetric } = props;

    const Component = CustomizableComponents.QUALITY_CONTROL_OVERVIEW;

    return (
        <div className='cvat-task-quality-page'>
            <Component task={task} getQualityColor={getQualityColor} targetMetric={targetMetric} />
        </div>
    );
}

export default React.memo(TaskQualityComponent);
