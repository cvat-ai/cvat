// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    FramesMetaData,
    Job,
    Task,
} from 'cvat-core-wrapper';
import React from 'react';
import { QualityColors } from 'utils/quality';
import { Row } from 'antd/es/grid';
import { SummaryComponent } from './summary';
import AllocationTableComponent from './allocation-table';

interface Props {
    task: Task;
    gtJob: Job;
    gtJobMeta: FramesMetaData;
    getQualityColor: (value?: number) => QualityColors;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

function TaskQualityManagementComponent(props: Props): JSX.Element {
    const {
        task, gtJob, gtJobMeta, getQualityColor, onDeleteFrames, onRestoreFrames,
    } = props;

    return (
        <div className='cvat-task-quality-page'>
            <Row>
                <SummaryComponent
                    excludedCount={Object.keys(gtJobMeta.deletedFrames).length}
                    activeCount={gtJobMeta.includedFrames.length}
                    totalCount={gtJobMeta.includedFrames.length}
                />
            </Row>
            <Row>
                <AllocationTableComponent
                    task={task}
                    gtJob={gtJob}
                    gtJobMeta={gtJobMeta}
                    getQualityColor={getQualityColor}
                    onDeleteFrames={onDeleteFrames}
                    onRestoreFrames={onRestoreFrames}
                />
            </Row>
        </div>
    );
}

export default React.memo(TaskQualityManagementComponent);
