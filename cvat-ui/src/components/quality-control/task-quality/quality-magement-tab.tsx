// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/es/grid';
import Spin from 'antd/lib/spin';

import { FramesMetaData, Task, TaskValidationLayout } from 'cvat-core-wrapper';
import AllocationTable from './allocation-table';
import SummaryComponent from './summary';

interface Props {
    task: Task;
    gtJobId: number;
    gtJobMeta: FramesMetaData;
    validationLayout: TaskValidationLayout;
    fetching: boolean;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

function QualityManagementTab(props: Readonly<Props>): JSX.Element {
    const {
        task, gtJobId, gtJobMeta, fetching, validationLayout,
        onDeleteFrames, onRestoreFrames,
    } = props;

    const totalCount = validationLayout.validationFrames.length;
    const excludedCount = validationLayout.disabledFrames.length;
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
                        mode={validationLayout.mode}
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
                        gtJobId={gtJobId}
                        gtJobMeta={gtJobMeta}
                        validationLayout={validationLayout}
                        onDeleteFrames={onDeleteFrames}
                        onRestoreFrames={onRestoreFrames}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(QualityManagementTab);
