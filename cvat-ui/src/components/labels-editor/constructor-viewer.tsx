// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from 'antd/lib/icon';
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
    const { onCreate } = props;
    const list = [
        <Button key='create' type='ghost' onClick={onCreate} className='cvat-constructor-viewer-new-item'>
            Add label
            <Icon type='plus-circle' />
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
