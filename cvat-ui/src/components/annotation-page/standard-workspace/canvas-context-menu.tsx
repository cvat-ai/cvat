// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';

import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';

interface Props {
    activatedStateID: number | null;
    visible: boolean;
    left: number;
    top: number;
}

export default function CanvasContextMenu(props: Props): JSX.Element | null {
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
        <div className='cvat-canvas-context-menu' style={{ top, left }}>
            <ObjectItemContainer clientID={activatedStateID} />
        </div>,
        window.document.body,
    );
}
