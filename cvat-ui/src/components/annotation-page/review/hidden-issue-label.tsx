// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import Tooltip from 'antd/lib/tooltip';
import { CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface Props {
    id: number;
    message: string;
    top: number;
    left: number;
    resolved: boolean;
    onClick: () => void;
    highlight: () => void;
    blur: () => void;
}

export default function HiddenIssueLabel(props: Props): ReactPortal {
    const {
        id, message, top, left, resolved, onClick, highlight, blur,
    } = props;

    useEffect(() => {
        if (!resolved) {
            setTimeout(highlight);
        } else {
            setTimeout(blur);
        }
    }, [resolved]);

    const elementID = `cvat-hidden-issue-label-${id}`;
    return ReactDOM.createPortal(
        <Tooltip title={message}>
            <Tag
                id={elementID}
                onClick={onClick}
                onMouseEnter={highlight}
                onMouseLeave={blur}
                style={{ top, left }}
                className='cvat-hidden-issue-label'
            >
                {resolved ? (
                    <CheckOutlined className='cvat-hidden-issue-resolved-indicator' />
                ) : (
                    <CloseCircleOutlined className='cvat-hidden-issue-unsolved-indicator' />
                )}
                {message}
            </Tag>
        </Tooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
