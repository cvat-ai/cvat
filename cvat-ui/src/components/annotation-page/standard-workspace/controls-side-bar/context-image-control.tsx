// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import CameraIcon from '@ant-design/icons/CameraOutlined';

import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

export interface Props {
    canvasInstance: Canvas | Canvas3d;
    switchContextImageVisibility: (hidden: boolean) => void;
    contextImageHidden: boolean;
}

function PhotoContextControl(props: Props): JSX.Element {
    const { contextImageHidden, switchContextImageVisibility } = props;

    return (
        <CVATTooltip title='Photo context show/hide' placement='right'>
            <CameraIcon
                className={[
                    'cvat-context-image-control',
                    'cvat-antd-icon-control',
                    !contextImageHidden ? 'cvat-active-canvas-control' : '',
                ].join(' ')}
                onClick={(): void => {
                    switchContextImageVisibility(!contextImageHidden);
                }}
            />
        </CVATTooltip>
    );
}

export default React.memo(PhotoContextControl);
