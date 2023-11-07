// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ScissorOutlined } from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import opencvWrapper from 'utils/opencv-wrapper/opencv-wrapper';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
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
        updateActiveControl, activatedStateID, canvasInstance, activeControl, disabled, shortcuts,
    } = props;

    const dynamicIconProps =
        activeControl === ActiveControl.SLICE ?
            {
                className: 'cvat-slice-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.slice({ enabled: false });
                    updateActiveControl(ActiveControl.CURSOR);
                },
            } :
            {
                className: 'cvat-slice-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.slice({
                        enabled: true,
                        getContour: opencvWrapper.getContourFromState,
                        clientID: activatedStateID || undefined,
                    });
                    updateActiveControl(ActiveControl.SLICE);
                },
            };

    const shortcutHandlers = {
        SWITCH_SLICE_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicIconProps.onClick();
        },
    };

    return disabled ? (
        <ScissorOutlined className='cvat-slice-control cvat-disabled-canvas-control' />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={{ SWITCH_SLICE_MODE: shortcuts.SWITCH_SLICE_MODE.details }}
                handlers={shortcutHandlers}
            />
            <CVATTooltip title={`Slice a mask/polygon shape ${shortcuts.SWITCH_SLICE_MODE.displayValue}`} placement='right'>
                <ScissorOutlined {...dynamicIconProps} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(SliceControl);
