// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    ReactPortal, useRef,
} from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import {
    ExclamationCircleOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    top: number;
    left: number;
    angle: number;
    scale: number;
    text: string
    onClick: () => void;
}

export default function ConflictLabel(props: Props): ReactPortal {
    const {
        top, left, angle, scale, onClick, text,
    } = props;

    const ref = useRef<HTMLElement>(null);

    const elementID = `cvat-hidden-issue-label-${top}`;
    return ReactDOM.createPortal(
        <CVATTooltip title={text}>
            <Tag
                ref={ref}
                id={elementID}
                onClick={onClick}
                style={{ top, left, transform: `scale(${scale}) rotate(${angle}deg)` }}
                className='cvat-conflict-label'
            >
                <ExclamationCircleOutlined />
            </Tag>
        </CVATTooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
