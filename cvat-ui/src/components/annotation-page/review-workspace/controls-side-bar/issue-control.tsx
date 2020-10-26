// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import { ActiveControl } from 'reducers/interfaces';
import { Canvas } from 'cvat-canvas-wrapper';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
}

function ResizeControl(props: Props): JSX.Element {
    const { activeControl, canvasInstance } = props;

    return (
        <Tooltip title='Open an issue' placement='right' mouseLeaveDelay={0}>
            <Icon
                type='message'
                className={
                    activeControl === ActiveControl.ZOOM_CANVAS ?
                        'cvat-issue-control cvat-active-canvas-control' :
                        'cvat-issue-control'
                }
                onClick={(): void => {
                    if (activeControl === ActiveControl.ZOOM_CANVAS) {
                        canvasInstance.zoomCanvas(false);
                    } else {
                        canvasInstance.cancel();
                        canvasInstance.zoomCanvas(true);
                    }
                }}
            />
        </Tooltip>
    );
}

export default React.memo(ResizeControl);
