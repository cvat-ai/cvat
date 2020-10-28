// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';

interface Props {
    id: number;
    message: string;
    top: number;
    left: number;
    onClick: () => void;
}

export default function HiddenIssueLabel(props: Props): ReactPortal {
    const {
        id, message, top, left, onClick,
    } = props;

    const elementID = `cvat-hidden-issue-label-${id}`;
    return ReactDOM.createPortal(
        <Tag id={elementID} onClick={onClick} style={{ top, left }} className='cvat-hidden-issue-label'>
            {message}
        </Tag>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
