// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import { updateActiveControl } from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { FourDirectionArrowsIcon } from 'icons';
import { ActiveControl, CombinedState } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { ShortcutScope } from 'utils/enums';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import { ThunkDispatch } from 'utils/redux';

export interface Props {
    canvasInstance: Canvas3d;
    activeControl: ActiveControl;
}

const componentShortcuts: Record<string, KeyMapItem> = {
    TOGGLE_CAMERA_RAY: {
        name: 'Create camera rays',
        description: 'Create rays by clicking calibrated related images',
        sequences: ['alt+b'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
};

registerComponentShortcuts(componentShortcuts);

function CameraRayControl({ canvasInstance, activeControl }: Props): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const normalizedKeyMap = useSelector((state: CombinedState) => state.shortcuts.normalizedKeyMap);
    const isActive = activeControl === ActiveControl.PICK_CAMERA_RAY;

    const toggleCameraRay = (): void => {
        if (isActive) {
            dispatch(updateActiveControl(ActiveControl.CURSOR));
            return;
        }

        canvasInstance.cancel();
        dispatch(updateActiveControl(ActiveControl.PICK_CAMERA_RAY));
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleCameraRay();
        }
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        TOGGLE_CAMERA_RAY: (event: KeyboardEvent | undefined): void => {
            event?.preventDefault();
            toggleCameraRay();
        },
    };

    const className = classNames('cvat-camera-ray-control', {
        'cvat-active-canvas-control': isActive,
    });

    return (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip
                title={`Create camera rays ${normalizedKeyMap.TOGGLE_CAMERA_RAY}`}
                placement='right'
            >
                <Icon
                    component={FourDirectionArrowsIcon}
                    className={className}
                    role='button'
                    tabIndex={0}
                    onClick={toggleCameraRay}
                    onKeyDown={handleKeyDown}
                />
            </CVATTooltip>
        </>
    );
}

Object.assign(CameraRayControl, { displayName: 'CameraRayControl' });
export default React.memo(CameraRayControl);
