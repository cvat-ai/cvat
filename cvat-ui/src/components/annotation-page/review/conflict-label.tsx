// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import Icon from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConflictIcon } from 'icons';
import { ConflictImportance, QualityConflict } from 'cvat-core-wrapper';

interface Props {
    top: number;
    left: number;
    angle: number;
    scale: number;
    text: string;
    darken: boolean;
    importance: ConflictImportance;
    conflict: QualityConflict;
    tooltipVisible: boolean;
    onEnter: (conflict: QualityConflict) => void;
    onLeave: (conflict: QualityConflict) => void;
}

export default function ConflictLabel(props: Props): ReactPortal {
    const {
        top, left, angle, scale, text, importance, darken, conflict, onEnter, onLeave, tooltipVisible,
    } = props;

    const conflictColor = importance === ConflictImportance.ERROR ? 'cvat-conflict-error' : 'cvat-conflict-warning';
    const darkenColor = darken ? 'cvat-conflict-darken' : '';

    return ReactDOM.createPortal(
        <CVATTooltip
            title={text}
            visible={tooltipVisible}
        >
            <Tag
                style={{
                    top,
                    left,
                    transform: `scale(${scale}) rotate(${angle}deg) translateY(-100%) translateX(-50%)`,
                }}
                className={`cvat-conflict-label ${conflictColor} ${darkenColor}`}
            >
                <Icon
                    onMouseEnter={() => {
                        onEnter(conflict);
                    }}
                    onMouseLeave={() => {
                        onLeave(conflict);
                    }}
                    component={ConflictIcon}
                />
            </Tag>
        </CVATTooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
