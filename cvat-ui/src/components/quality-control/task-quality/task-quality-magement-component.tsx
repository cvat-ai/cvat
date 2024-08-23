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
import Spin from 'antd/lib/spin';
import { SummaryComponent } from './summary';
import AllocationTableComponent from './allocation-table';

interface Props {
    task: Task;
    gtJob: Job;
    gtJobMeta: FramesMetaData;
    fetching: boolean;
    getQualityColor: (value?: number) => QualityColors;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

function TaskQualityManagementComponent(props: Props): JSX.Element {
    const {
        task, gtJob, gtJobMeta, getQualityColor,
        onDeleteFrames, onRestoreFrames, fetching,
    } = props;

    return (
        <div className='cvat-task-quality-page'>
            {
                fetching && (
                    <div className='cvat-spinner-container'>
                        <Spin className='cvat-spinner' />
                    </div>
                )
            }
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
