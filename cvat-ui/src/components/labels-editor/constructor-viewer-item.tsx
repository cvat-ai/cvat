// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';

import CVATTooltip from 'components/common/cvat-tooltip';
import consts from 'consts';
import { LabelOptColor } from './common';

interface ConstructorViewerItemProps {
    label: LabelOptColor;
    color?: string;
    onUpdate: (label: LabelOptColor) => void;
    onDelete: (label: LabelOptColor) => void;
}

export default function ConstructorViewerItem(props: ConstructorViewerItemProps): JSX.Element {
    const {
        color, label, onUpdate, onDelete,
    } = props;

    return (
        <div style={{ background: color || consts.NEW_LABEL_COLOR }} className='cvat-constructor-viewer-item'>
            <Text>{label.name}</Text>
            <CVATTooltip title='Update attributes'>
                <span
                    role='button'
                    tabIndex={0}
                    onClick={(): void => onUpdate(label)}
                    onKeyPress={(): boolean => false}
                >
                    <EditOutlined />
                </span>
            </CVATTooltip>
            <CVATTooltip title='Delete label'>
                <span
                    role='button'
                    tabIndex={0}
                    onClick={(): void => onDelete(label)}
                    onKeyPress={(): boolean => false}
                >
                    <DeleteOutlined />
                </span>
            </CVATTooltip>
        </div>
    );
}
