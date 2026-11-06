// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import notification from 'antd/lib/notification';

import { setCameraRayFromContextImagePoint, updateActiveControl, updateCameraRay } from 'actions/annotation-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import CameraRayMarker from '../camera-ray-marker';
import type { SVGObject } from '../context-image-svg-overlay';

interface Params {
    contextImage: ImageBitmap | undefined;
    contextImageName: string | undefined;
}

interface CameraRayInteraction {
    isPickingCameraRay: boolean;
    objects: SVGObject[];
    onImageClick(point: [number, number]): void;
    onMarkerClick(id: string): void;
}

export default function useCameraRay({ contextImage, contextImageName }: Params): CameraRayInteraction {
    const dispatch = useDispatch<ThunkDispatch>();
    const { isPickingCameraRay, cameraRayPoint } = useSelector((state: CombinedState) => ({
        isPickingCameraRay: state.annotation.canvas.activeControl === ActiveControl.PICK_CAMERA_RAY,
        cameraRayPoint: state.annotation.canvas.cameraRayPoint,
    }), shallowEqual);
    const objects = useMemo<SVGObject[]>(() => {
        if (!cameraRayPoint || cameraRayPoint.relatedImageName !== contextImageName) {
            return [];
        }

        return [{
            id: cameraRayPoint.id,
            type: 'camera-ray',
            className: 'cvat-context-image-camera-ray-marker',
            render: (scale): JSX.Element => (
                <CameraRayMarker
                    point={[cameraRayPoint.pixel[0], cameraRayPoint.pixel[1]]}
                    scale={scale}
                />
            ),
        }];
    }, [cameraRayPoint, contextImageName]);

    const onImageClick = useCallback((point: [number, number]): void => {
        if (!isPickingCameraRay || !contextImage || !contextImageName) {
            return;
        }

        if (!dispatch(setCameraRayFromContextImagePoint(contextImageName, point))) {
            notification.warning({
                message: 'Camera calibration is unavailable',
                description: 'A 3D camera ray cannot be calculated for this related image.',
            });
            return;
        }

        dispatch(updateActiveControl(ActiveControl.CURSOR));
    }, [contextImage, contextImageName, dispatch, isPickingCameraRay]);

    const onMarkerClick = useCallback((id: string): void => {
        if (id !== cameraRayPoint?.id) {
            return;
        }

        dispatch(updateActiveControl(ActiveControl.CURSOR));
        dispatch(updateCameraRay(null));
    }, [cameraRayPoint, dispatch]);

    return {
        isPickingCameraRay,
        objects,
        onImageClick,
        onMarkerClick,
    };
}
