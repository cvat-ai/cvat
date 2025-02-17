// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { getCVATStore } from 'cvat-store';
import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import opencvWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { SliceIcon } from 'icons';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    disabled?: boolean;
}

const componentShortcuts = {
    SWITCH_SLICE_MODE_STANDARD_CONTROLS: {
        name: 'Slice mode',
        description: 'Activate or deactivate a mode to slice a polygon/mask',
        sequences: ['alt+j'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function SliceControl(props: Props): JSX.Element {
    const {
        updateActiveControl, canvasInstance, activeControl, disabled,
    } = props;

    const { keyMap, normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

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

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SWITCH_SLICE_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicIconProps.onClick();
        },
    };

    return disabled ? (
        <Icon className='cvat-slice-control cvat-disabled-canvas-control' component={SliceIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip title={`Slice a mask/polygon shape ${normalizedKeyMap.SWITCH_SLICE_MODE_STANDARD_CONTROLS}`} placement='right'>
                <Icon {...dynamicIconProps} component={SliceIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(SliceControl);
