// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import classNames from 'classnames';

export type SVGObject = {
    id: string;
    type: string;
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
    onObjectClick(object: SVGObject): void;
}

function ContextImageSVGOverlay(props: Props): JSX.Element {
    const {
        imageSize,
        scale,
        objects,
        className,
        onBackgroundClick,
        onObjectClick,
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
                        event.stopPropagation();
                        onObjectClick(object);
                    }}
                >
                    {object.render(scale)}
                </g>
            ))}
        </svg>
    );
}

export default React.memo(ContextImageSVGOverlay);
