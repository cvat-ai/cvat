// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Icon,
    Tooltip,
} from 'antd';

import {
    ZoomIcon,
} from 'icons';

import {
    ActiveControl,
} from 'reducers/interfaces';

import {
    Canvas,
} from 'cvat-canvas';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
}

function ResizeControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
    } = props;

    return (
        <Tooltip title='Select a region of interest' placement='right'>
            <Icon
                component={ZoomIcon}
                className={activeControl === ActiveControl.ZOOM_CANVAS
                    ? 'cvat-active-canvas-control' : ''}
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
