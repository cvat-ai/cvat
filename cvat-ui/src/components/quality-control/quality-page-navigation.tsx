// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { createContext, Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from 'antd/lib/breadcrumb';
import Button from 'antd/lib/button';
import { LeftOutlined } from '@ant-design/icons';

export interface QualityPageNavigation {
    tab: string;
    projectID?: number;
    taskID?: number;
    jobID?: number;
    backLabel: string;
    onBack: () => void;
}

export const QualityPageNavigationContext = createContext<
Dispatch<SetStateAction<QualityPageNavigation | null>> | null
>(null);

export function QualityPageNavigationHeader({ navigation }: {
    navigation: QualityPageNavigation;
}): JSX.Element {
    const {
        projectID, taskID, jobID, backLabel, onBack,
    } = navigation;
    const items = [];
    if (projectID) {
        items.push({ title: <Link to={`/projects/${projectID}/quality-control`}>{`Project #${projectID}`}</Link> });
    }
    if (taskID) {
        items.push({ title: <Link to={`/tasks/${taskID}/quality-control`}>{`Task #${taskID}`}</Link> });
    }
    if (jobID) {
        items.push({ title: <span aria-current='page'>{`Job #${jobID}`}</span> });
    }

    return (
        <div className='cvat-quality-page-navigation'>
            <Button type='link' icon={<LeftOutlined />} aria-label={backLabel} onClick={onBack}>
                Back
            </Button>
            <Breadcrumb items={items} />
        </div>
    );
}
