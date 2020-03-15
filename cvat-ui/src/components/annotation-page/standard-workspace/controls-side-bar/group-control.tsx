// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Tooltip,
    Icon,
} from 'antd';

import {
    GroupIcon,
} from 'icons';

import { Canvas } from 'cvat-canvas';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;

    groupObjects(enabled: boolean): void;
}

function GroupControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        groupObjects,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.GROUP
        ? {
            className: 'cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.group({ enabled: false });
                groupObjects(false);
            },
        } : {
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.group({ enabled: true });
                groupObjects(true);
            },
        };

    return (
        <Tooltip title='Group shapes/tracks' placement='right'>
            <Icon {...dynamicIconProps} component={GroupIcon} />
        </Tooltip>
    );
}

export default React.memo(GroupControl);
