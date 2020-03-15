// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Tooltip,
    Icon,
} from 'antd';

import {
    SplitIcon,
} from 'icons';

import { Canvas } from 'cvat-canvas';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;

    splitTrack(enabled: boolean): void;
}

function SplitControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        splitTrack,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.SPLIT
        ? {
            className: 'cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.split({ enabled: false });
                splitTrack(false);
            },
        } : {
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.split({ enabled: true });
                splitTrack(true);
            },
        };

    return (
        <Tooltip title='Split a track' placement='right'>
            <Icon {...dynamicIconProps} component={SplitIcon} />
        </Tooltip>
    );
}

export default React.memo(SplitControl);
