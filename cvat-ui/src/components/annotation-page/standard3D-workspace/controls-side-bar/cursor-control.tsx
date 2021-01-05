// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';

import { CursorIcon } from 'icons';
import { ActiveControl } from 'reducers/interfaces';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';

interface Props {
    canvasInstance: Canvas;
    cursorShortkey: string;
    activeControl: ActiveControl;
}

function CursorControl(props: Props): JSX.Element {
    const { canvasInstance, activeControl, cursorShortkey } = props;

    return (
        <Tooltip title={`Cursor ${cursorShortkey}`} placement='right' mouseLeaveDelay={0}>
            <Icon
                component={CursorIcon}
                className={
                    activeControl === ActiveControl.CURSOR ?
                        'cvat-active-canvas-control cvat-cursor-control' :
                        'cvat-cursor-control'
                }
            />
        </Tooltip>
    );
}

export default React.memo(CursorControl);
