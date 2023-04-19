// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { Job, JobType, Task } from 'cvat-core-wrapper';
import EmptyQuality from './empty-quality';

interface Props {
    task: Task,
}

function TaskQualityComponent(props: Props): JSX.Element {
    const { task } = props;

    const hasGTJob = task.jobs.some((job: Job) => job.type === JobType.GROUND_TRUTH);
    if (!hasGTJob) {
        return (<EmptyQuality taskId={task.id} />);
    }

    return (
        <div className='cvat-task-quality-page'>hello</div>
    );
}

export default React.memo(TaskQualityComponent);
