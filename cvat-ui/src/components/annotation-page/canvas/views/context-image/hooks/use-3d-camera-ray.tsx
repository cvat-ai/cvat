// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import notification from 'antd/lib/notification';

import CVATTooltip from 'components/common/cvat-tooltip';
import {
    addCameraRayFromContextImagePoint,
    removeCameraRay,
    clearContextImageCameraRays,
} from 'actions/annotation-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import CameraRayMarker from '../camera-ray-marker';
import { SVGObjectType } from '../context-image-svg-overlay';
import type { SVGObject } from '../context-image-svg-overlay';

interface Params {
    contextImageName: string | undefined;
}

interface CameraRayInteraction {
    isPickingCameraRay: boolean;
    objects: SVGObject[];
    onImageClick(point: [number, number], event: React.MouseEvent<SVGSVGElement>): void;
    onObjectClick(object: SVGObject, event: React.MouseEvent<SVGGElement>): void;
}

const cameraRayMarkerTooltip = (
    <>
        <div>Click to clear the ray.</div>
        <div>Shift+click to clear all rays on this image.</div>
    </>
);

export default function useCameraRay({ contextImageName }: Params): CameraRayInteraction {
    const dispatch = useDispatch<ThunkDispatch>();
    const { cameraRays, isPickingCameraRay } = useSelector((state: CombinedState) => ({
        cameraRays: state.annotation.canvas.cameraRays[state.annotation.player.frame.number] || [],
        isPickingCameraRay: state.annotation.canvas.activeControl === ActiveControl.PICK_CAMERA_RAY,
    }), shallowEqual);
    const objects = useMemo<SVGObject[]>(() => {
        if (!contextImageName) {
            return [];
        }

        return cameraRays.filter((cameraRay) => cameraRay.relatedImageName === contextImageName).map((cameraRay) => ({
            id: cameraRay.id,
            type: SVGObjectType.CAMERA_RAY,
            className: 'cvat-context-image-camera-ray-marker',
            render: (scale): JSX.Element => (
                <CVATTooltip title={cameraRayMarkerTooltip} mouseEnterDelay={0.5}>
                    <g>
                        <CameraRayMarker
                            point={cameraRay.pixel}
                            scale={scale}
                            color={cameraRay.color}
                        />
                    </g>
                </CVATTooltip>
            ),
        }));
    }, [cameraRays, contextImageName]);

    const onImageClick = useCallback((
        point: [number, number],
        event: React.MouseEvent<SVGSVGElement>,
    ): void => {
        if (!contextImageName || !isPickingCameraRay) {
            return;
        }

        event.stopPropagation();

        if (!dispatch(addCameraRayFromContextImagePoint(contextImageName, point))) {
            notification.warning({
                message: 'Camera calibration is unavailable',
                description: 'A 3D camera ray cannot be calculated for this related image.',
            });
        }
    }, [contextImageName, dispatch, isPickingCameraRay]);

    const onObjectClick = useCallback((object: SVGObject, event: React.MouseEvent<SVGGElement>): void => {
        if (object.type !== SVGObjectType.CAMERA_RAY) {
            return;
        }

        event.stopPropagation();
        if (event.shiftKey && contextImageName) {
            dispatch(clearContextImageCameraRays(contextImageName));
            return;
        }

        dispatch(removeCameraRay(object.id));
    }, [contextImageName, dispatch]);

    return {
        isPickingCameraRay,
        objects,
        onImageClick,
        onObjectClick,
    };
}
