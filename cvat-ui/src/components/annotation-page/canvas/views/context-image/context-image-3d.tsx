// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';

import ContextImage from './context-image';
import type { ContextImageOverlayProps } from './context-image';
import ContextImageSVGOverlay, { SVGObjectType } from './context-image-svg-overlay';
import type { SVGObject } from './context-image-svg-overlay';
import useCameraRay from './hooks/use-camera-ray';
import useCuboidProjections from './hooks/use-cuboid-projections';

interface Props {
    offset: number[];
}

function ContextImage3DOverlay({
    imageSize,
    contextImageName,
    scale,
}: ContextImageOverlayProps): JSX.Element {
    const {
        objects: cameraRayObjects,
        onImageClick,
        onMarkerClick,
    } = useCameraRay({ contextImageName });
    const {
        objects: cuboidProjectionObjects,
        onObjectMouseEnter: onCuboidProjectionMouseEnter,
        onObjectDoubleClick: onCuboidProjectionDoubleClick,
    } = useCuboidProjections({ contextImageName });

    const onBackgroundClick = useCallback((point: [number, number]): void => {
        onImageClick(point);
    }, [onImageClick]);
    const onObjectClick = useCallback((object: SVGObject, event: React.MouseEvent<SVGGElement>): void => {
        if (object.type === SVGObjectType.CAMERA_RAY) {
            event.stopPropagation();
            onMarkerClick(object.id, event.shiftKey);
        }
    }, [onMarkerClick]);
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
            onBackgroundClick={onBackgroundClick}
            onObjectClick={onObjectClick}
            onObjectMouseEnter={onObjectMouseEnter}
            onObjectDoubleClick={onObjectDoubleClick}
        />
    );
}

function ContextImage3D({ offset }: Props): JSX.Element {
    return <ContextImage offset={offset} Overlay={ContextImage3DOverlay} />;
}

export default React.memo(ContextImage3D);
