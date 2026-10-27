// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Icon, { CloseOutlined } from '@ant-design/icons';
import classNames from 'classnames';

import { updateActiveControl, updateCameraRay } from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { CameraRayIcon } from 'icons';
import { ActiveControl, CombinedState } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { ShortcutScope } from 'utils/enums';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

export interface Props {
    canvasInstance: Canvas3d;
    activeControl: ActiveControl;
}

const componentShortcuts: Record<string, KeyMapItem> = {
    TOGGLE_CAMERA_RAY: {
        name: 'Pick/clear camera ray',
        description: 'Pick a calibrated related-image point or clear the current 3D camera ray',
        sequences: ['alt+r'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
};

registerComponentShortcuts(componentShortcuts);

function CameraRayControl(props: Props): JSX.Element {
    const { canvasInstance, activeControl } = props;
    const dispatch = useDispatch<ThunkDispatch>();
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const normalizedKeyMap = useSelector((state: CombinedState) => state.shortcuts.normalizedKeyMap);
    const { hasCalibratedRelatedImages, hasCameraRay } = useSelector((state: CombinedState) => ({
        hasCalibratedRelatedImages: !!state.annotation.player.frame.data?.relatedImages?.length,
        hasCameraRay: state.annotation.canvas.hasCameraRay,
    }), shallowEqual);
    const isDisabled = !hasCalibratedRelatedImages && !hasCameraRay;

    const toggleCameraRay = (): void => {
        if (hasCameraRay) {
            dispatch(updateCameraRay(null));
            dispatch(updateActiveControl(ActiveControl.CURSOR));
            return;
        }

        if (isDisabled) {
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
            if (isDisabled) {
                return;
            }

            if (event) {
                event.preventDefault();
            }
            toggleCameraRay();
        },
    };

    const className = classNames('cvat-camera-ray-control', {
        'cvat-disabled-canvas-control': isDisabled,
        'cvat-active-canvas-control': !isDisabled && activeControl === ActiveControl.PICK_CAMERA_RAY,
    });
    let title = hasCameraRay ? 'Clear camera ray' : 'Pick related image point to create camera ray';
    title += ` ${normalizedKeyMap.TOGGLE_CAMERA_RAY}`;

    return (
        <>
            <GlobalHotKeys
                keyMap={isDisabled ? {} : subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip
                title={title}
                placement='right'
            >
                <span
                    className={className}
                    role='button'
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={toggleCameraRay}
                    onKeyDown={handleKeyDown}
                >
                    <Icon component={CameraRayIcon} />
                    {hasCameraRay && <CloseOutlined className='cvat-camera-ray-clear-indicator' />}
                </span>
            </CVATTooltip>
        </>
    );
}

Object.assign(CameraRayControl, { displayName: 'CameraRayControl' });
export default React.memo(CameraRayControl);
