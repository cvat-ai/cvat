// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';

import { Label } from './common';
import SkeletonViewerItem from './skeleton-viewer-item';
// import Text from 'antd/lib/typography/Text';

interface SkeletonViewerProps {
    labels: Label[];
    onUpdate: (label: Label) => void;
    onDelete: (label: Label) => void;
    onCreate: () => void;
}

export default function SkeletonViewer(props: SkeletonViewerProps): JSX.Element {
    const { onCreate } = props;
    const list = [

        <Button key='create' type='ghost' onClick={onCreate} className='cvat-constructor-viewer-new-item'>
            Create a new Skeleton
            <PlusCircleOutlined />
        </Button>,
    ];
    for (const label of props.labels) {
        list.push(
            <SkeletonViewerItem
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
