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
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
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

    const activeCount = gtJobMeta.includedFrames.filter((frameID: number) => (
        !(frameID in gtJobMeta.deletedFrames)
    )).length;
    const excludedCount = Object.keys(gtJobMeta.deletedFrames).filter((frameID: string) => (
        gtJobMeta.includedFrames.includes(+frameID)
    )).length;

    const managementPagePlugins = usePlugins(
        (state: CombinedState) => (
            state.plugins.components.qualityControlPage.tabs.management.page
        ), props,
    );
    const managementPageItems: [JSX.Element, number][] = [];
    managementPageItems.push([(
        <Row>
            <SummaryComponent
                excludedCount={excludedCount}
                activeCount={activeCount}
                totalCount={gtJobMeta.includedFrames.length}
            />
        </Row>
    ), 10]);
    managementPageItems.push([(
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
    ), 20]);
    managementPageItems.push(
        ...managementPagePlugins.map(({ component: Component, weight }, index) => {
            const component = <Component targetProps={props} key={index} />;
            return [component, weight] as [JSX.Element, number];
        }),
    );

    return (
        <div className='cvat-task-quality-page'>
            {
                fetching && (
                    <div className='cvat-spinner-container'>
                        <Spin className='cvat-spinner' />
                    </div>
                )
            }
            {
                managementPageItems.sort((item1, item2) => item1[1] - item2[1])
                    .map((item) => item[0])
            }
        </div>
    );
}

export default React.memo(TaskQualityManagementComponent);
