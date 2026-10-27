// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    ReactPortal, useEffect, useRef,
} from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

import { Issue } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    container?: HTMLElement;
    idSuffix?: string;
    issue: Issue;
    top: number;
    left: number;
    angle: number;
    scale: number;
    resolved: boolean;
    onClick: (event: React.MouseEvent) => void;
    onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
    highlight: () => void;
    blur: () => void;
}

export default function HiddenIssueLabel(props: Props): ReactPortal {
    const {
        issue, top, left, angle, scale, resolved, onClick, highlight, blur,
    } = props;

    const { id, comments } = issue;
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!resolved) {
            setTimeout(highlight);
        } else {
            setTimeout(blur);
        }
    }, [resolved]);

    useEffect(() => {
        if (ref.current) {
            const { current } = ref;
            const listener = (event: WheelEvent): void => {
                event.stopPropagation();
                if (event.deltaX > 0) {
                    current.parentElement?.appendChild(current);
                } else {
                    current.parentElement?.prepend(current);
                }
            };

            current.addEventListener('wheel', listener);
            return () => {
                current.removeEventListener('wheel', listener);
            };
        }

        return () => {};
    }, [ref.current]);

    const elementID = `cvat-hidden-issue-label-${id}${props.idSuffix || ''}`;
    return ReactDOM.createPortal(
        <CVATTooltip title={comments[0]?.message || 'No comments found'}>
            <Tag
                ref={ref}
                id={elementID}
                onClick={onClick}
                onPointerDown={props.onPointerDown}
                role='button'
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        ref.current?.click();
                    }
                }}
                onMouseEnter={highlight}
                onMouseLeave={blur}
                style={{ top, left, transform: `scale(${scale}) rotate(${angle}deg)` }}
                className={`cvat-hidden-issue-label ${props.onPointerDown ? 'cvat-issue-label-draggable' : ''}`}
            >
                {resolved ? (
                    <CheckCircleOutlined className='cvat-hidden-issue-resolved-indicator' />
                ) : (
                    <CloseCircleOutlined className='cvat-hidden-issue-unsolved-indicator' />
                )}
                {comments[0]?.message || null}
            </Tag>
        </CVATTooltip>,
        props.container || window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
