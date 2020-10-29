// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

interface Props {
    id: number;
    message: string;
    top: number;
    left: number;
    resolved: boolean;
    onClick: () => void;
}

export default function HiddenIssueLabel(props: Props): ReactPortal {
    const {
        id, message, top, left, resolved, onClick,
    } = props;

    const onMouseEnter = (): void => {
        const element = window.document.getElementById(`cvat_canvas_issue_region_${id}`);
        if (element) {
            element.style.display = 'block';
        }
    };

    const onMouseLeave = (): void => {
        const element = window.document.getElementById(`cvat_canvas_issue_region_${id}`);
        if (element) {
            element.style.display = '';
        }
    };

    const elementID = `cvat-hidden-issue-label-${id}`;
    return ReactDOM.createPortal(
        <Tooltip title={message}>
            <Tag
                id={elementID}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{ top, left }}
                className='cvat-hidden-issue-label'
            >
                {resolved ? (
                    <Icon className='cvat-hidden-issue-resolved-indicator' type='check' />
                ) : (
                    <Icon className='cvat-hidden-issue-unsolved-indicator' type='close-circle' />
                )}
                {message}
            </Tag>
        </Tooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
