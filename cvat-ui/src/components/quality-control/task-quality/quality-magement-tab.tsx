// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/es/grid';

import {
    FramesMetaData, QualitySettings,
    Task, TaskValidationLayout,
} from 'cvat-core-wrapper';
import AllocationTable from './allocation-table';
import SummaryComponent from './summary';

interface Props {
    task: Task;
    gtJobId: number;
    gtJobMeta: FramesMetaData;
    validationLayout: TaskValidationLayout;
    qualitySettings: QualitySettings;
    onDeleteFrames: (frames: number[]) => void;
    onRestoreFrames: (frames: number[]) => void;
}

function QualityManagementTab(props: Readonly<Props>): JSX.Element {
    const {
        task, gtJobId, gtJobMeta,
        validationLayout, qualitySettings,
        onDeleteFrames, onRestoreFrames,
    } = props;

    const totalCount = validationLayout.validationFrames.length;
    const excludedCount = validationLayout.disabledFrames.length;
    const activeCount = totalCount - excludedCount;

    return (
        <div className='cvat-quality-control-management-tab'>
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
                        qualitySettings={qualitySettings}
                        onDeleteFrames={onDeleteFrames}
                        onRestoreFrames={onRestoreFrames}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(QualityManagementTab);
