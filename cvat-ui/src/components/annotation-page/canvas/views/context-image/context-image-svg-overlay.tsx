// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import classNames from 'classnames';

import type { ObjectState } from 'cvat-core-wrapper';

export enum SVGObjectType {
    CAMERA_RAY = 'camera-ray',
    CUBOID_PROJECTION = 'cuboid-projection',
}

export type SVGObject = {
    id: string;
    type: SVGObjectType;
    state?: ObjectState;
    className?: string;
    render(scale: number): React.ReactNode;
};

interface ImageSize {
    width: number;
    height: number;
}

interface Props {
    imageSize: ImageSize;
    scale: number;
    objects: SVGObject[];
    className?: string;
    onBackgroundClick(point: [number, number]): void;
    onObjectClick(object: SVGObject, event: React.MouseEvent<SVGGElement>): void;
    onObjectMouseEnter(object: SVGObject): void;
    onObjectDoubleClick(object: SVGObject): void;
}

function ContextImageSVGOverlay(props: Props): JSX.Element {
    const {
        imageSize,
        scale,
        objects,
        className,
        onBackgroundClick,
        onObjectClick,
        onObjectMouseEnter,
        onObjectDoubleClick,
    } = props;
    const onOverlayClick = useCallback((event: React.MouseEvent<SVGSVGElement>): void => {
        const { currentTarget, clientX, clientY } = event;
        const rect = currentTarget.getBoundingClientRect();
        onBackgroundClick([
            (clientX - rect.left) / scale,
            (clientY - rect.top) / scale,
        ]);
    }, [onBackgroundClick, scale]);

    const { width: imageWidth, height: imageHeight } = imageSize;

    return (
        <svg
            className={classNames('cvat-context-image-svg-overlay', className)}
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            onClick={onOverlayClick}
        >
            <rect
                className='cvat-context-image-svg-overlay-hit-area'
                width={imageWidth}
                height={imageHeight}
            />
            {objects.map((object) => (
                <g
                    key={object.id}
                    className={object.className}
                    onClick={(event) => {
                        onObjectClick(object, event);
                    }}
                    onMouseEnter={() => {
                        onObjectMouseEnter(object);
                    }}
                    onDoubleClick={() => {
                        onObjectDoubleClick(object);
                    }}
                >
                    {object.render(scale)}
                </g>
            ))}
        </svg>
    );
}

export default React.memo(ContextImageSVGOverlay);
