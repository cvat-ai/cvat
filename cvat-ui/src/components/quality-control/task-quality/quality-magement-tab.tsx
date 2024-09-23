// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/es/grid';
import Spin from 'antd/lib/spin';

import { FramesMetaData, Job, Task } from 'cvat-core-wrapper';
import AllocationTable from './allocation-table';
import SummaryComponent from './summary';

interface Props {
    task: Task;
    gtJob: Job;
    gtJobMeta: FramesMetaData;
    fetching: boolean;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

function QualityManagementTab(props: Readonly<Props>): JSX.Element {
    const {
        task, gtJob, gtJobMeta, fetching,
        onDeleteFrames, onRestoreFrames,
    } = props;

    const totalCount = gtJobMeta.getDataFrameNumbers().length;
    const excludedCount = Object.keys(gtJobMeta.deletedFrames).length;
    const activeCount = totalCount - excludedCount;

    return (
        <div className='cvat-quality-control-management-tab'>
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
                        totalCount={totalCount}
                    />
                </Col>
            </Row>
            <Row>
                <Col span={24}>
                    <AllocationTable
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

export default React.memo(QualityManagementTab);
