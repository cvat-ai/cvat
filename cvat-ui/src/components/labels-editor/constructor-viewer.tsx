// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';

import ConstructorViewerItem from './constructor-viewer-item';
import { LabelOptColor } from './common';

export type CreatorType = 'basic' | 'skeleton' | 'model';

interface ConstructorViewerProps {
    labels: LabelOptColor[];
    onUpdate: (label: LabelOptColor) => void;
    onDelete: (label: LabelOptColor) => void;
    onCreate: (creatorType: CreatorType) => void;
    enableSkeletonCreator?: boolean;
    enableFromModelCreator?: boolean;
}

function ConstructorViewer(props: ConstructorViewerProps): JSX.Element {
    const {
        onCreate,
        onUpdate,
        onDelete,
        labels,
        enableSkeletonCreator = true,
        enableFromModelCreator = true,
    } = props;

    const list: JSX.Element[] = [
        <Button key='create' onClick={() => onCreate('basic')} className='cvat-constructor-viewer-new-item'>
            Add label
            <PlusCircleOutlined />
        </Button>,
    ];

    if (enableSkeletonCreator) {
        list.push(
            <Button
                key='create_skeleton'
                onClick={() => onCreate('skeleton')}
                className='cvat-constructor-viewer-new-skeleton-item'
            >
                Setup skeleton
                <PlusCircleOutlined />
            </Button>,
        );
    }

    if (enableFromModelCreator) {
        list.push(
            <Button
                key='from_model'
                onClick={() => onCreate('model')}
                className='cvat-constructor-viewer-new-from-model-item'
            >
                From model
                <PlusCircleOutlined />
            </Button>,
        );
    }

    for (const label of labels) {
        list.push(
            <ConstructorViewerItem
                onUpdate={onUpdate}
                onDelete={onDelete}
                label={label}
                key={label.id}
                color={label.color}
            />,
        );
    }

    return <div className='cvat-constructor-viewer'>{list}</div>;
}

export default React.memo(ConstructorViewer);
