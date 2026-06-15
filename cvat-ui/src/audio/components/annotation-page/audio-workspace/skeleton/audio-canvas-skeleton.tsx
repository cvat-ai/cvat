// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

const WAVE_BARS = 64;

export default function AudioCanvasSkeleton(): JSX.Element {
    return (
        <div className='cvat-audio-skeleton-canvas' aria-busy='true'>
            <div className='cvat-audio-skeleton-waveform'>
                <div className='cvat-audio-skeleton-waveform-bars'>
                    {Array.from({ length: WAVE_BARS }, (_, i) => (
                        <span
                            key={i}
                            className='cvat-audio-skeleton-bar'
                            style={{ animationDelay: `${(i % 12) * 60}ms` }}
                        />
                    ))}
                </div>
                <div className='cvat-audio-skeleton-minimap' />
            </div>
        </div>
    );
}
