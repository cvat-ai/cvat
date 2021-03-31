// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { SplitIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers/interfaces';
import CVATTooltip from 'components/common/cvat-tooltip';

export interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    switchSplitShortcut: string;
    disabled?: boolean;
    splitTrack(enabled: boolean): void;
}

function SplitControl(props: Props): JSX.Element {
    const {
        switchSplitShortcut, activeControl, canvasInstance, splitTrack, disabled,
    } = props;

    const dynamicIconProps =
        activeControl === ActiveControl.SPLIT ?
            {
                className: 'cvat-split-track-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.split({ enabled: false });
                    splitTrack(false);
                },
            } :
            {
                className: 'cvat-split-track-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.split({ enabled: true });
                    splitTrack(true);
                },
            };

    return disabled ? (
        <Icon className='cvat-split-track-control cvat-disabled-canvas-control' component={SplitIcon} />
    ) : (
        <CVATTooltip title={`Split a track ${switchSplitShortcut}`} placement='right'>
            <Icon {...dynamicIconProps} component={SplitIcon} />
        </CVATTooltip>
    );
}

export default React.memo(SplitControl);
