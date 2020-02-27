// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Icon,
    Button,
} from 'antd';

import ConstructorViewerItem from './constructor-viewer-item';
import { Label } from './common';

interface ConstructorViewerProps {
    labels: Label[];
    onUpdate: (label: Label) => void;
    onDelete: (label: Label) => void;
    onCreate: () => void;
}

const colors = [
    '#ff811e', '#9013fe', '#0074d9',
    '#549ca4', '#e8c720', '#3d9970',
    '#6b2034', '#2c344c', '#2ecc40',
];

let currentColor = 0;

function nextColor(): string {
    const color = colors[currentColor];
    currentColor += 1;
    if (currentColor >= colors.length) {
        currentColor = 0;
    }
    return color;
}

export default function ConstructorViewer(props: ConstructorViewerProps): JSX.Element {
    const { onCreate } = props;
    currentColor = 0;

    const list = [
        <Button key='create' type='ghost' onClick={onCreate} className='cvat-constructor-viewer-new-item'>
            Add label
            <Icon type='plus-circle' />
        </Button>];
    for (const label of props.labels) {
        list.push(
            <ConstructorViewerItem
                onUpdate={props.onUpdate}
                onDelete={props.onDelete}
                label={label}
                key={label.id}
                color={nextColor()}
            />,
        );
    }

    return (
        <div className='cvat-constructor-viewer'>
            { list }
        </div>
    );
}
