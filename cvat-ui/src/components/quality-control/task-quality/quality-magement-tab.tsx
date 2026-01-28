// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef } from 'react';
import { Row } from 'antd/es/grid';
import Text from 'antd/lib/typography/Text';

import {
    FramesMetaData, QualitySettings, Task, TaskValidationLayout,
} from 'cvat-core-wrapper';
import Card from 'components/common/cvat-card';
import { validationModeText } from 'utils/quality';
import { usePageSizeData } from 'utils/hooks';
import AllocationTable from './allocation-table';

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
    const validationModeTextRepresentation = validationModeText(task);

    const tabRef = useRef(null);
    const pageSizeData = usePageSizeData(tabRef);

    return (
        <div className='cvat-quality-control-management-tab' ref={tabRef}>
            <Row className='cvat-quality-control-management-tab-summary'>
                <Card
                    title='Total validation frames'
                    className='cvat-allocation-summary-total'
                    value={totalCount}
                    size={{ cardSize: 8 }}
                />
                <Card
                    title='Excluded validation frames'
                    className='cvat-allocation-summary-excluded'
                    value={excludedCount}
                    size={{ cardSize: 8 }}
                />
                <Card
                    title='Active validation frames'
                    className='cvat-allocation-summary-active'
                    value={activeCount}
                    size={{ cardSize: 8 }}
                />
            </Row>
            { validationModeTextRepresentation ? (
                <Row className='cvat-quality-control-validation-mode-hint'>
                    <Text type='secondary'>
                        The task&apos;s validation mode is configured as&nbsp;
                    </Text>
                    <Text type='secondary' strong>{validationModeTextRepresentation}</Text>
                </Row>
            ) : null}
            <AllocationTable
                task={task}
                gtJobId={gtJobId}
                gtJobMeta={gtJobMeta}
                validationLayout={validationLayout}
                qualitySettings={qualitySettings}
                onDeleteFrames={onDeleteFrames}
                onRestoreFrames={onRestoreFrames}
                pageSizeData={pageSizeData}
            />
        </div>
    );
}

export default React.memo(QualityManagementTab);
