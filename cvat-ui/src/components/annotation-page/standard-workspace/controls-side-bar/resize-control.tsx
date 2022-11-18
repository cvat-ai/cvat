// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { ZoomIcon } from 'icons';
import { ActiveControl } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

export interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
}

function ResizeControl(props: Props): JSX.Element {
    const { activeControl, canvasInstance } = props;

    return (
        <CVATTooltip title='Select a region of interest' placement='right'>
            <Icon
                component={ZoomIcon}
                className={
                    activeControl === ActiveControl.ZOOM_CANVAS ?
                        'cvat-resize-control cvat-active-canvas-control' :
                        'cvat-resize-control'
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
        </CVATTooltip>
    );
}

export default React.memo(ResizeControl);
