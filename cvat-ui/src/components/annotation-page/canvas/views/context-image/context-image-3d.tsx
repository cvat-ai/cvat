// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';

import ContextImage from './context-image';
import type { ContextImageOverlayProps } from './context-image';
import ContextImageSVGOverlay from './context-image-svg-overlay';
import type { SVGObject } from './context-image-svg-overlay';
import useCameraRay from './hooks/use-camera-ray';

interface Props {
    offset: number[];
}

function ContextImage3DOverlay({
    imageSize,
    contextImageName,
    scale,
}: ContextImageOverlayProps): JSX.Element {
    const {
        objects,
        onImageClick,
        onMarkerClick,
    } = useCameraRay({ contextImageName });

    const onBackgroundClick = useCallback((point: [number, number]): void => {
        onImageClick(point);
    }, [onImageClick]);
    const onObjectClick = useCallback((object: SVGObject, isShiftKeyDown: boolean): void => {
        if (object.type === 'camera-ray') {
            onMarkerClick(object.id, isShiftKeyDown);
        }
    }, [onMarkerClick]);

    return (
        <ContextImageSVGOverlay
            imageSize={imageSize}
            scale={scale}
            objects={objects}
            onBackgroundClick={onBackgroundClick}
            onObjectClick={onObjectClick}
        />
    );
}

function ContextImage3D({ offset }: Props): JSX.Element {
    return <ContextImage offset={offset} Overlay={ContextImage3DOverlay} />;
}

export default React.memo(ContextImage3D);
