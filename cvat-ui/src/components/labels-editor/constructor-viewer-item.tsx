// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Icon,
    Tooltip,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { Label } from './common';

interface ConstructorViewerItemProps {
    label: Label;
    color: string;
    onUpdate: (label: Label) => void;
    onDelete: (label: Label) => void;
}

export default function ConstructorViewerItem(props: ConstructorViewerItemProps): JSX.Element {
    const {
        color,
        label,
        onUpdate,
        onDelete,
    } = props;

    return (
        <div style={{ background: color }} className='cvat-constructor-viewer-item'>
            <Text>{label.name}</Text>
            <Tooltip title='Update attributes'>
                <span
                    role='button'
                    tabIndex={0}
                    onClick={(): void => onUpdate(label)}
                    onKeyPress={(): boolean => false}
                >
                    <Icon theme='filled' type='edit' />
                </span>
            </Tooltip>
            { label.id < 0
                && (
                    <Tooltip title='Delete label'>
                        <span
                            role='button'
                            tabIndex={0}
                            onClick={(): void => onDelete(label)}
                            onKeyPress={(): boolean => false}
                        >
                            <Icon type='close' />
                        </span>
                    </Tooltip>
                )}
        </div>
    );
}
