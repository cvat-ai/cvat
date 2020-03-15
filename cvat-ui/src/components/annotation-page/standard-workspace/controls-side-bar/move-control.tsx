// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Icon,
    Tooltip,
} from 'antd';

import {
    MoveIcon,
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

function MoveControl(props: Props): JSX.Element {
    const {
        canvasInstance,
        activeControl,
    } = props;

    return (
        <Tooltip title='Move the image' placement='right'>
            <Icon
                component={MoveIcon}
                className={activeControl === ActiveControl.DRAG_CANVAS
                    ? 'cvat-active-canvas-control' : ''}
                onClick={(): void => {
                    if (activeControl === ActiveControl.DRAG_CANVAS) {
                        canvasInstance.dragCanvas(false);
                    } else {
                        canvasInstance.cancel();
                        canvasInstance.dragCanvas(true);
                    }
                }}
            />
        </Tooltip>
    );
}

export default React.memo(MoveControl);
