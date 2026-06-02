// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

const ITEM_PLACEHOLDERS = 5;

export default function AudioRegionsListSkeleton(): JSX.Element {
    return (
        <div className='cvat-audio-regions-list-wrapper cvat-audio-skeleton-regions'>
            <div className='cvat-audio-skeleton-regions-header'>
                <div className='cvat-audio-skeleton-line cvat-audio-skeleton-line-md' />
                <div className='cvat-audio-skeleton-regions-header-actions'>
                    <span className='cvat-audio-skeleton-square' />
                    <span className='cvat-audio-skeleton-square' />
                    <span className='cvat-audio-skeleton-square' />
                </div>
            </div>
            <div className='cvat-audio-skeleton-regions-list'>
                {Array.from({ length: ITEM_PLACEHOLDERS }, (_, i) => (
                    <div key={i} className='cvat-audio-skeleton-region-item'>
                        <span className='cvat-audio-skeleton-square cvat-audio-skeleton-square-xs' />
                        <div className='cvat-audio-skeleton-region-item-info'>
                            <div className='cvat-audio-skeleton-line cvat-audio-skeleton-line-lg' />
                            <div className='cvat-audio-skeleton-line cvat-audio-skeleton-line-sm' />
                            <div className='cvat-audio-skeleton-line cvat-audio-skeleton-line-xs' />
                        </div>
                        <div className='cvat-audio-skeleton-region-item-actions'>
                            <span className='cvat-audio-skeleton-square cvat-audio-skeleton-square-xs' />
                            <span className='cvat-audio-skeleton-square cvat-audio-skeleton-square-xs' />
                            <span className='cvat-audio-skeleton-square cvat-audio-skeleton-square-xs' />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
