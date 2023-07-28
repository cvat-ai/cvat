// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';

import CVATTooltip from 'components/common/cvat-tooltip';
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
    let textColor = '#ffffff';
    try {
        // convert color to grayscale and from the result get better text color
        // (for darken background -> lighter text, etc.)
        const [r, g, b] = [backgroundColor.slice(1, 3), backgroundColor.slice(3, 5), backgroundColor.slice(5, 7)];
        const grayscale = (parseInt(r, 16) + parseInt(g, 16) + parseInt(b, 16)) / 3;
        if (grayscale - 128 >= 0) {
            textColor = '#000000';
        }
    } catch (_: any) {
        // nothing to do
    }

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
