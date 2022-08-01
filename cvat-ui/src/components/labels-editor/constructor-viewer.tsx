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
    onCreate: () => void;
}

export default function ConstructorViewer(props: ConstructorViewerProps): JSX.Element {
    const {
        onCreate, labels, onUpdate, onDelete,
    } = props;
    const list = [
        <Button key='create' type='ghost' onClick={onCreate} className='cvat-constructor-viewer-new-item'>
            Add label
            <PlusCircleOutlined />
        </Button>,
    ];
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
