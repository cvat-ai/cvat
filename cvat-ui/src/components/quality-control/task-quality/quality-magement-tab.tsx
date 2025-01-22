// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Row, Col } from 'antd/es/grid';
import Text from 'antd/lib/typography/Text';

import {
    FramesMetaData, QualitySettings, Task, TaskValidationLayout,
} from 'cvat-core-wrapper';
import AnalyticsCard from 'components/analytics-page/views/analytics-card';
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

    const tableRef = useRef(null);
    const [pageSizeData, setPageSizeData] = useState({ width: 0, height: 0 });

    const totalCount = validationLayout.validationFrames.length;
    const excludedCount = validationLayout.disabledFrames.length;
    const activeCount = totalCount - excludedCount;
    let validationModeText: string | null = null;
    if (validationLayout.mode === 'gt') {
        validationModeText = 'Ground truth';
    } else if (validationLayout.mode === 'gt_pool') {
        validationModeText = 'Honeypots';
    }

    useLayoutEffect(() => {
        const resize = (): void => {
            if (tableRef?.current) {
                const { clientWidth, clientHeight } = tableRef.current;
                setPageSizeData({ width: clientWidth, height: clientHeight });
            }
        };

        resize();
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className='cvat-quality-control-management-tab' ref={tableRef}>
            <Row className='cvat-quality-control-management-tab-summary'>
                <AnalyticsCard
                    title='Total validation frames'
                    className='cvat-allocation-summary-total'
                    value={totalCount}
                    size={{ cardSize: 8 }}
                />
                <AnalyticsCard
                    title='Excluded validation frames'
                    className='cvat-allocation-summary-excluded'
                    value={excludedCount}
                    size={{ cardSize: 8 }}
                />
                <AnalyticsCard
                    title='Active validation frames'
                    className='cvat-allocation-summary-active'
                    value={activeCount}
                    size={{ cardSize: 8 }}
                />
            </Row>
            { validationModeText ? (
                <Row className='cvat-quality-control-validation-mode-hint'>
                    <Text type='secondary'>
                        The task&apos;s validation mode is configured as&nbsp;
                    </Text>
                    <Text type='secondary' strong>{validationModeText}</Text>
                </Row>
            ) : null}
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
                        pageSizeData={pageSizeData}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(QualityManagementTab);
