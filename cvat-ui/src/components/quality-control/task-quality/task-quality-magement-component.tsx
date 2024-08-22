// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    FramesMetaData,
    Task,
} from 'cvat-core-wrapper';
import React from 'react';
import { QualityColors } from 'utils/quality';
import { Row } from 'antd/es/grid';
import { SummaryComponent } from './summary';
// import AllocationTableComponent from './allocation-table';

interface Props {
    task: Task;
    gtJobFramesMeta: FramesMetaData;
    getQualityColor: (value?: number) => QualityColors;
}

function TaskQualityManagementComponent(props: Props): JSX.Element {
    const {
        task, getQualityColor, gtJobFramesMeta,
    } = props;

    return (
        <div className='cvat-task-quality-page'>
            <Row>
                <SummaryComponent
                    excludedCount={Object.keys(gtJobFramesMeta.deletedFrames).length}
                    activeCount={gtJobFramesMeta.size}
                    totalCount={gtJobFramesMeta.size}
                />
            </Row>
            {/* <Row>
                <AllocationTableComponent
                    report={report}
                    task={task}
                    gtJob={gtJob}
                    generateReportLink={generateReportLink}
                    updateFrames={updateFrames}
                    getQualityColor={getQualityColor}
                />
            </Row> */}
        </div>
    );
}

export default React.memo(TaskQualityManagementComponent);
