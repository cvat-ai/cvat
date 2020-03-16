// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';


interface Props {
    activatedStateID: number | null;
    visible: boolean;
    left: number;
    top: number;
}

export default function CanvasPointContextMenu(props: Props): JSX.Element | null {
    const {
        activatedStateID,
        visible,
        left,
        top,
    } = props;

    if (!visible || activatedStateID === null) {
        return null;
    }

    return ReactDOM.createPortal(
        <div className='cvat-canvas-point-context-menu' style={{ top, left }}>
            <span>Haha</span>
        </div>,
        window.document.body,
    );
}
