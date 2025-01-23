// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { SplitIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import { useSelector } from 'react-redux';

export interface Props {
    canvasInstance: Canvas | Canvas3d;
    dynamicIconProps: Record<string, any>;
    disabled?: boolean;
}

function SplitControl(props: Props): JSX.Element {
    const {
        dynamicIconProps,
        canvasInstance,
        disabled,
    } = props;

    const { normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

    return disabled ? (
        <Icon className='cvat-split-track-control cvat-disabled-canvas-control' component={SplitIcon} />
    ) : (
        <CVATTooltip
            title={`Split a track ${
                canvasInstance instanceof Canvas3d ?
                    normalizedKeyMap.SWITCH_SPLIT_MODE_STANDARD_3D_CONTROLS :
                    normalizedKeyMap.SWITCH_SPLIT_MODE_STANDARD_CONTROLS
            }`}
            placement='right'
        >
            <Icon {...dynamicIconProps} component={SplitIcon} />
        </CVATTooltip>
    );
}

export default React.memo(SplitControl);
