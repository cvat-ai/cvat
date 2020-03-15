// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Tooltip,
    Icon,
} from 'antd';

import {
    MergeIcon,
} from 'icons';

import { Canvas } from 'cvat-canvas';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;

    mergeObjects(enabled: boolean): void;
}

function MergeControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        mergeObjects,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.MERGE
        ? {
            className: 'cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.merge({ enabled: false });
                mergeObjects(false);
            },
        } : {
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.merge({ enabled: true });
                mergeObjects(true);
            },
        };

    return (
        <Tooltip title='Merge shapes/tracks' placement='right'>
            <Icon {...dynamicIconProps} component={MergeIcon} />
        </Tooltip>
    );
}

export default React.memo(MergeControl);
