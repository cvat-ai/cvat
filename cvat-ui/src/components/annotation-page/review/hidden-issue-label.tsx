// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    id: number;
    message: string;
    top: number;
    left: number;
    angle: number;
    scale: number;
    resolved: boolean;
    onClick: () => void;
    highlight: () => void;
    blur: () => void;
}

export default function HiddenIssueLabel(props: Props): ReactPortal {
    const {
        id, message, top, left, angle, scale, resolved, onClick, highlight, blur,
    } = props;

    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!resolved) {
            setTimeout(highlight);
        } else {
            setTimeout(blur);
        }
    }, [resolved]);

    const elementID = `cvat-hidden-issue-label-${id}`;
    return ReactDOM.createPortal(
        <CVATTooltip title={message}>
            <Tag
                ref={ref}
                id={elementID}
                onClick={onClick}
                onMouseEnter={highlight}
                onMouseLeave={blur}
                onWheel={(event: React.WheelEvent) => {
                    if (ref.current !== null) {
                        const selfElement = ref.current;
                        if (event.deltaX > 0) {
                            selfElement.parentElement?.appendChild(selfElement);
                        } else {
                            selfElement.parentElement?.prepend(selfElement);
                        }
                    }
                }}
                style={{ top, left, transform: `scale(${scale}) rotate(${angle}deg)` }}
                className='cvat-hidden-issue-label'
            >
                {resolved ? (
                    <CheckCircleOutlined className='cvat-hidden-issue-resolved-indicator' />
                ) : (
                    <CloseCircleOutlined className='cvat-hidden-issue-unsolved-indicator' />
                )}
                {message}
            </Tag>
        </CVATTooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
