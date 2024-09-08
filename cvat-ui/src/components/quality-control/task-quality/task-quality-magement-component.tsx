// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { FramesMetaData, Job, Task } from 'cvat-core-wrapper';
import React from 'react';
import { Row, Col } from 'antd/es/grid';
import Spin from 'antd/lib/spin';
import CustomizableComponents from 'components/customizable-components';
import { SummaryComponent } from './summary';

interface Props {
    task: Task;
    gtJob: Job;
    gtJobMeta: FramesMetaData;
    fetching: boolean;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

function TaskQualityManagementComponent(props: Readonly<Props>): JSX.Element {
    const {
        task, gtJob, gtJobMeta,
        onDeleteFrames, onRestoreFrames, fetching,
    } = props;

    const activeCount = gtJobMeta.includedFrames
        .filter((frameID: number) => !(frameID in gtJobMeta.deletedFrames)).length;

    const excludedCount = Object.keys(gtJobMeta.deletedFrames)
        .filter((frameID: string) => gtJobMeta.includedFrames.includes(+frameID)).length;

    const AllocationTableComponent = CustomizableComponents.QUALITY_CONTROL_ALLOCATION_TABLE;

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
                <Col span={24}>
                    <SummaryComponent
                        excludedCount={excludedCount}
                        activeCount={activeCount}
                        totalCount={gtJobMeta.includedFrames.length}
                    />
                </Col>
            </Row>
            <Row>
                <Col span={24}>
                    <AllocationTableComponent
                        task={task}
                        gtJob={gtJob}
                        gtJobMeta={gtJobMeta}
                        onDeleteFrames={onDeleteFrames}
                        onRestoreFrames={onRestoreFrames}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(TaskQualityManagementComponent);
