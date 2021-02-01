// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';

import { CameraIcon } from 'icons';
import { ActiveControl } from 'reducers/interfaces';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';

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
            <Icon
                component={CameraIcon}
                className={[
                    'cvat-move-control',
                    activeControl === ActiveControl.PHOTO_CONTEXT ? 'cvat-active-canvas-control' : null,
                ]}
                onClick={(): void => {
                    hideShowContextImage(!contextImageHide);
                }}
            />
        </Tooltip>
    );
}

export default React.memo(PhotoContextControl);
