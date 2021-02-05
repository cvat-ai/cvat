// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';

import { MoveIcon } from 'icons';
import { ActiveControl } from 'reducers/interfaces';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
}

function MoveControl(props: Props): JSX.Element {
    const { activeControl } = props;

    return (
        <Tooltip title='Move the image' placement='right' mouseLeaveDelay={0}>
            <Icon
                component={MoveIcon}
                className={[
                    'cvat-move-control',
                    activeControl === ActiveControl.DRAG_CANVAS ? ' cvat-active-canvas-control' : null,
                ]}
            />
        </Tooltip>
    );
}

export default React.memo(MoveControl);
