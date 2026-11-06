// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

interface Props {
    point: [number, number];
    scale: number;
}

export default function CameraRayMarker({ point, scale }: Props): JSX.Element {
    const [x, y] = point;
    return (
        <g
            className='cvat-context-image-camera-ray-marker-content'
            transform={`translate(${x} ${y}) scale(${1 / scale})`}
        >
            <circle r={12} fill='transparent' />
            <path
                d='M -10 0 L -2.5 0 M 10 0 L 2.5 0 M 0 -10 L 0 -2.5 M 0 10 L 0 2.5'
                fill='none'
                stroke='#00e5ff'
                strokeLinecap='round'
                strokeWidth={2}
            />
            <path
                d='M -2.5 0 L -6.5 -4 L -6.5 4 Z M 2.5 0 L 6.5 -4 L 6.5 4 Z
                    M 0 -2.5 L -4 -6.5 L 4 -6.5 Z M 0 2.5 L -4 6.5 L 4 6.5 Z'
                fill='#00e5ff'
            />
        </g>
    );
}
