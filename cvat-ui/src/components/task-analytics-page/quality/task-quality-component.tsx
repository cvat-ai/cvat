// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React from 'react';
import { Job, JobType, Task } from 'cvat-core-wrapper';
import { Row } from 'antd/lib/grid';
import JobItem from 'components/job-item/job-item';
import EmptyQuality from './empty-quality';
import MeanQuality from './mean-quality';

interface Props {
    task: Task,
    onJobUpdate: (job: Job) => void
}

function TaskQualityComponent(props: Props): JSX.Element {
    const { task, onJobUpdate } = props;

    const gtJob = task.jobs.find((job: Job) => job.type === JobType.GROUND_TRUTH);
    if (!gtJob) {
        return (<EmptyQuality taskId={task.id} />);
    }

    return (
        <div className='cvat-task-quality-page'>
            <Row>
                <MeanQuality />
            </Row>
            <Row>
                <JobItem job={gtJob} onJobUpdate={onJobUpdate} />
            </Row>
        </div>
    );
}

export default React.memo(TaskQualityComponent);
