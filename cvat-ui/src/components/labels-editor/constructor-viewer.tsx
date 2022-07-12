// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';

import ConstructorViewerItem from './constructor-viewer-item';
import { Label } from './common';

interface ConstructorViewerProps {
    labels: Label[];
    onUpdate: (label: Label) => void;
    onDelete: (label: Label) => void;
    onCreate: (creatorType: 'basic' | 'skeleton') => void;
}

function ConstructorViewer(props: ConstructorViewerProps): JSX.Element {
    const { onCreate } = props;
    const list = [
        <Button key='create' type='ghost' onClick={() => onCreate('basic')} className='cvat-constructor-viewer-new-item'>
            Add label
            <PlusCircleOutlined />
        </Button>,
        <Button key='create_skeleton' type='ghost' onClick={() => onCreate('skeleton')} className='cvat-constructor-viewer-new-skeleton-item'>
            Setup skeleton
            <PlusCircleOutlined />
        </Button>,
    ];
    for (const label of props.labels) {
        list.push(
            <ConstructorViewerItem
                onUpdate={props.onUpdate}
                onDelete={props.onDelete}
                label={label}
                key={label.id}
                color={label.color}
            />,
        );
    }

    return <div className='cvat-constructor-viewer'>{list}</div>;
}

export default React.memo(ConstructorViewer);
