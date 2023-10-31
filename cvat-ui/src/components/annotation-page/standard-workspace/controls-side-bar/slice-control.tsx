// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { SplitIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

export interface Props {
    sliceShape(enabled: boolean): void;
    activatedStateID: number | null;
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    disabled?: boolean;
    shortcuts: {
        SWITCH_SLICE_MODE: {
            details: KeyMapItem;
            displayValue: string;
        };
    };
}

function SliceControl(props: Props): JSX.Element {
    const {
        sliceShape, activatedStateID, canvasInstance, activeControl, disabled, shortcuts,
    } = props;

    const dynamicIconProps =
        activeControl === ActiveControl.SLICE ?
            {
                className: 'cvat-slice-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.slice({ enabled: false });
                    sliceShape(false);
                },
            } :
            {
                className: 'cvat-slice-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.slice({ enabled: true });
                    sliceShape(true);
                },
            };

    const shortcutHandlers = {
        SWITCH_SLICE_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicIconProps.onClick();
        },
    };

    return disabled ? (
        <Icon className='cvat-slice-control cvat-disabled-canvas-control' component={SplitIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={{ SWITCH_SLICE_MODE: shortcuts.SWITCH_SLICE_MODE.details }}
                handlers={shortcutHandlers}
            />
            <CVATTooltip title={`Slice a mask/polygon shape ${shortcuts.SWITCH_SLICE_MODE.displayValue}`} placement='right'>
                <Icon {...dynamicIconProps} component={SplitIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(SliceControl);
