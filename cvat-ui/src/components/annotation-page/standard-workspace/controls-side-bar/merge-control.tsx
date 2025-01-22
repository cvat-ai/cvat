// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { MergeIcon } from 'icons';
import { CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import { useSelector } from 'react-redux';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';

export interface Props {
    disabled?: boolean;
    dynamicIconProps: Record<string, any>;
    canvasInstance: Canvas | Canvas3d;
}

function MergeControl(props: Props): JSX.Element {
    const {
        disabled,
        dynamicIconProps,
        canvasInstance,
    } = props;

    const { normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

    return disabled ? (
        <Icon className='cvat-merge-control cvat-disabled-canvas-control' component={MergeIcon} />
    ) : (
        <CVATTooltip
            title={`Merge shapes/tracks ${
                canvasInstance instanceof Canvas ?
                    normalizedKeyMap.SWITCH_MERGE_MODE_STANDARD_CONTROLS :
                    normalizedKeyMap.SWITCH_MERGE_MODE_STANDARD_3D_CONTROLS}`}
            placement='right'
        >
            <Icon {...dynamicIconProps} component={MergeIcon} />
        </CVATTooltip>
    );
}

export default React.memo(MergeControl);
