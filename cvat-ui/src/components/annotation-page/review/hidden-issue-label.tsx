// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    ReactPortal, useEffect, useRef, useState,
} from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';

import { Issue, Comment } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    issue: Issue;
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
        issue, top, left, angle, scale, resolved, onClick, highlight, blur,
    } = props;

    const { id } = issue;

    const ref = useRef<HTMLElement>(null);
    const [firstComment, setFirstComments] = useState<Comment | null>(null);

    useEffect(() => {
        if (!resolved) {
            setTimeout(highlight);
        } else {
            setTimeout(blur);
        }
    }, [resolved]);

    useEffect(() => {
        issue.initComments().then(() => {
            setFirstComments((issue.comments as Comment[])[0]);
        });
    }, []);

    const elementID = `cvat-hidden-issue-label-${id}`;
    return ReactDOM.createPortal(
        <CVATTooltip title={firstComment ? firstComment.message : 'Loading..'}>
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
                {firstComment ? firstComment.message : <LoadingOutlined />}
            </Tag>
        </CVATTooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
