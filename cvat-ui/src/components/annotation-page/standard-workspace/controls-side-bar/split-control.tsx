// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { SplitIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

export interface Props {
    canvasInstance: Canvas | Canvas3d;
    activeControl: ActiveControl;
    disabled?: boolean;
    splitTrack(enabled: boolean): void;
    shortcuts: {
        SWITCH_SPLIT_MODE: {
            details: KeyMapItem;
            displayValue: string;
        };
    };
}

function SplitControl(props: Props): JSX.Element {
    const {
        shortcuts, activeControl, canvasInstance, splitTrack, disabled,
    } = props;

    const shortcutHandlers = {
        SWITCH_SPLIT_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            const splitting = activeControl === ActiveControl.SPLIT;
            if (!splitting) {
                canvasInstance.cancel();
            }
            canvasInstance.split({ enabled: !splitting });
            splitTrack(!splitting);
        },
    };

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
        <>
            <GlobalHotKeys
                keyMap={{ SWITCH_SPLIT_MODE: shortcuts.SWITCH_SPLIT_MODE.details }}
                handlers={shortcutHandlers}
            />
            <CVATTooltip title={`Split a track ${shortcuts.SWITCH_SPLIT_MODE.displayValue}`} placement='right'>
                <Icon {...dynamicIconProps} component={SplitIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(SplitControl);
