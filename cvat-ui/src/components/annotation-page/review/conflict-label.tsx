// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    ReactPortal, useRef,
} from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import Icon from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConflictIcon } from 'icons';
import { ConflictImportance } from 'cvat-core-wrapper';

interface Props {
    top: number;
    left: number;
    angle: number;
    scale: number;
    text: string;
    darken: boolean;
    importance: ConflictImportance;
    onClick: () => void;
}

export default function ConflictLabel(props: Props): ReactPortal {
    const {
        top, left, angle, scale, onClick, text, importance, darken,
    } = props;

    const ref = useRef<HTMLElement>(null);
    const conflictColor = importance === ConflictImportance.ERROR ? 'cvat-conflict-error' : 'cvat-conflict-warning';
    const darkenColor = darken ? 'cvat-conflict-darken' : '';

    const elementID = `cvat-hidden-issue-label-${top}`;
    return ReactDOM.createPortal(
        <CVATTooltip title={text}>
            <Tag
                ref={ref}
                id={elementID}
                onClick={onClick}
                style={{
                    top,
                    left,
                    transform: `scale(${scale}) rotate(${angle}deg) translateY(-100%) translateX(-50%)`,
                }}
                className={`cvat-conflict-label ${conflictColor} ${darkenColor}`}
            >
                <Icon component={ConflictIcon} />
            </Tag>
        </CVATTooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
