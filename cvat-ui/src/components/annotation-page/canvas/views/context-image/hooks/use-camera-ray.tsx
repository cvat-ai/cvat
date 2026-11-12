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
import { CombinedState } from 'reducers';
import type { CameraRayPoint } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import CameraRayMarker from '../camera-ray-marker';
import type { SVGObject } from '../context-image-svg-overlay';

interface Params {
    contextImage: ImageBitmap | undefined;
    contextImageName: string | undefined;
}

interface CameraRayInteraction {
    objects: SVGObject[];
    onImageClick(point: [number, number]): void;
    onMarkerClick(id: string, removeAll: boolean): void;
}

const cameraRayMarkerTooltip = (
    <>
        <div>Click to clear the ray.</div>
        <div>Shift+click to clear all rays on this image.</div>
    </>
);

export default function useCameraRay({ contextImage, contextImageName }: Params): CameraRayInteraction {
    const dispatch = useDispatch<ThunkDispatch>();
    const cameraRays = useSelector((state: CombinedState): CameraRayPoint[] => (
        state.annotation.canvas.cameraRays[state.annotation.player.frame.number] || []
    ), shallowEqual);
    const objects = useMemo<SVGObject[]>(() => {
        if (!contextImageName) {
            return [];
        }

        return cameraRays.filter((cameraRay) => cameraRay.relatedImageName === contextImageName).map((cameraRay) => ({
            id: cameraRay.id,
            type: 'camera-ray',
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

    const onImageClick = useCallback((point: [number, number]): void => {
        if (!contextImage || !contextImageName) {
            return;
        }

        if (!dispatch(addCameraRayFromContextImagePoint(contextImageName, point))) {
            notification.warning({
                message: 'Camera calibration is unavailable',
                description: 'A 3D camera ray cannot be calculated for this related image.',
            });
        }
    }, [contextImage, contextImageName, dispatch]);

    const onMarkerClick = useCallback((id: string, removeAll: boolean): void => {
        if (removeAll && contextImageName) {
            dispatch(clearContextImageCameraRays(contextImageName));
            return;
        }

        dispatch(removeCameraRay(id));
    }, [contextImageName, dispatch]);

    return {
        objects,
        onImageClick,
        onMarkerClick,
    };
}
