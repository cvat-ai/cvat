// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { getCVATStore } from 'cvat-store';
import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import opencvWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { SliceIcon } from 'icons';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
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
        updateActiveControl, canvasInstance, activeControl, disabled, shortcuts,
    } = props;

    const dynamicIconProps =
        activeControl === ActiveControl.SLICE ?
            {
                className: 'cvat-slice-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.slice({ enabled: false });
                },
            } :
            {
                className: 'cvat-slice-control',
                onClick: (event?: React.MouseEvent): void => {
                    const triggeredByShorcut = !event;
                    canvasInstance.cancel();
                    canvasInstance.slice({
                        enabled: true,
                        getContour: opencvWrapper.getContourFromState,
                        ...(triggeredByShorcut ? {
                            clientID: getCVATStore().getState().annotation.annotations.activatedStateID || undefined,
                        } : {}),
                    });
                    updateActiveControl(ActiveControl.SLICE);
                },
            };

    return disabled ? (
        <Icon className='cvat-slice-control cvat-disabled-canvas-control' component={SliceIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={{ SWITCH_SLICE_MODE: shortcuts.SWITCH_SLICE_MODE.details }}
                handlers={{
                    SWITCH_SLICE_MODE: (event: KeyboardEvent | undefined) => {
                        if (event) event.preventDefault();
                        dynamicIconProps.onClick();
                    },
                }}
            />
            <CVATTooltip title={`Slice a mask/polygon shape ${shortcuts.SWITCH_SLICE_MODE.displayValue}`} placement='right'>
                <Icon {...dynamicIconProps} component={SliceIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(SliceControl);
