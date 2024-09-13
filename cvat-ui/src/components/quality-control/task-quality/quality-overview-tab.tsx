// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { TargetMetric, Task } from 'cvat-core-wrapper';
import CustomizableComponents from 'components/customizable-components';

interface Props {
    task: Task;
    targetMetric: TargetMetric;
}

function QualityOverviewTab(props: Readonly<Props>): JSX.Element {
    const { task, targetMetric } = props;
    const [Component] = CustomizableComponents.QUALITY_CONTROL_OVERVIEW.slice(-1);

    return (
        <div className='cvat-quality-control-overview-tab'>
            <Component task={task} targetMetric={targetMetric} />
        </div>
    );
}

export default React.memo(QualityOverviewTab);
