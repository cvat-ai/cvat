// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';

import CVATTooltip from 'components/common/cvat-tooltip';
import { computeTextColor } from 'utils/compute-text-color';
import config from 'config';
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

    const backgroundColor = color || config.NEW_LABEL_COLOR;
    const textColor = computeTextColor(backgroundColor);

    return (
        <div style={{ background: backgroundColor }} className='cvat-constructor-viewer-item'>
            <Text style={{ color: textColor }}>{label.name}</Text>
            <CVATTooltip title='Update attributes'>
                <span
                    style={{ color: textColor }}
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
                    style={{ color: textColor }}
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
