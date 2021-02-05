// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import CameraIcon from '@ant-design/icons/CameraOutlined';
import Tooltip from 'antd/lib/tooltip';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';
import React from 'react';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    hideShowContextImage: (hidden: boolean) => void;
    contextImageHide: boolean;
}

function PhotoContextControl(props: Props): JSX.Element {
    const { activeControl, contextImageHide, hideShowContextImage } = props;

    return (
        <Tooltip title='Photo context show/hide' placement='right' mouseLeaveDelay={0}>
            <CameraIcon
                className={`cvat-move-control
    cvat-control-side-bar-icon-size ${
        activeControl === ActiveControl.PHOTO_CONTEXT ? 'cvat-active-canvas-control' : ''
        }`}
                onClick={(): void => {
                    hideShowContextImage(!contextImageHide);
                }}
            />
        </Tooltip>
    );
}

export default React.memo(PhotoContextControl);
