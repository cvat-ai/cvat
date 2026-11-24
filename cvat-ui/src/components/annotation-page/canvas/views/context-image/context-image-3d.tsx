// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { activateObject } from 'actions/annotation-actions';
import { ThunkDispatch } from 'utils/redux';
import ContextImage from './context-image';
import type { ContextImageOverlayProps } from './context-image';
import ContextImageSVGOverlay, { SVGObjectType } from './context-image-svg-overlay';
import type { SVGObject } from './context-image-svg-overlay';
import use3dCameraRay from './hooks/use-3d-camera-ray';
import use3dCuboidProjections from './hooks/use-3d-cuboid-projections';

interface Props {
    offset: number[];
}

function ContextImage3DOverlay({
    imageSize,
    contextImageName,
    scale,
}: ContextImageOverlayProps): JSX.Element {
    const {
        isPickingCameraRay,
        objects: cameraRayObjects,
        onImageClick,
        onObjectClick: onCameraRayClick,
    } = use3dCameraRay({ contextImageName });
    const {
        objects: cuboidProjectionObjects,
        onObjectClick: onCuboidProjectionClick,
        onObjectMouseEnter: onCuboidProjectionMouseEnter,
        onObjectDoubleClick: onCuboidProjectionDoubleClick,
    } = use3dCuboidProjections({ contextImageName, imageSize });

    const onBackgroundClick = useCallback((
        point: [number, number],
        event: React.MouseEvent<SVGSVGElement>,
    ): void => {
        onImageClick(point, event);
    }, [onImageClick]);
    const onObjectClick = useCallback((object: SVGObject, event: React.MouseEvent<SVGGElement>): void => {
        switch (object.type) {
            case SVGObjectType.CAMERA_RAY:
                onCameraRayClick(object, event);
                break;
            case SVGObjectType.CUBOID_PROJECTION:
                onCuboidProjectionClick(object, event);
                break;
            default:
                break;
        }
    }, [onCameraRayClick, onCuboidProjectionClick]);
    const onObjectMouseEnter = useCallback((object: SVGObject): void => {
        onCuboidProjectionMouseEnter(object);
    }, [onCuboidProjectionMouseEnter]);
    const onObjectDoubleClick = useCallback((object: SVGObject): void => {
        onCuboidProjectionDoubleClick(object);
    }, [onCuboidProjectionDoubleClick]);

    return (
        <ContextImageSVGOverlay
            imageSize={imageSize}
            scale={scale}
            objects={[...cuboidProjectionObjects, ...cameraRayObjects]}
            className={isPickingCameraRay ? 'cvat-context-image-camera-ray-picking' : undefined}
            onBackgroundClick={onBackgroundClick}
            onObjectClick={onObjectClick}
            onObjectMouseEnter={onObjectMouseEnter}
            onObjectDoubleClick={onObjectDoubleClick}
        />
    );
}

function ContextImage3D({ offset }: Props): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const onBackgroundClick = useCallback((): void => {
        dispatch(activateObject(null, null, null));
    }, [dispatch]);

    return (
        <ContextImage
            offset={offset}
            Overlay={ContextImage3DOverlay}
            onClick={onBackgroundClick}
        />
    );
}

export default React.memo(ContextImage3D);
