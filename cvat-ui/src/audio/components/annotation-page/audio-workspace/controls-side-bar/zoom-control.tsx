// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ZoomInOutlined } from '@ant-design/icons';

import { ZOOM_MAX, ZOOM_MIN } from '../utils/zoom-bounds';
import AudioSliderControl from './audio-slider-control';

export interface Props {
    zoom: number;
    onZoomChange(zoom: number): void;
}

function formatZoom(zoom: number): string {
    return Number.isInteger(zoom) ? `x${zoom}` : `x${zoom.toFixed(1)}`;
}

function ZoomControl(props: Props): JSX.Element {
    const { zoom, onZoomChange } = props;
    const currentZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));

    return (
        <AudioSliderControl
            icon={<ZoomInOutlined />}
            tooltip='Zoom'
            value={currentZoom}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.1}
            formatValue={formatZoom}
            className='cvat-audio-zoom-control'
            valueBadge={formatZoom(currentZoom)}
            onChange={onZoomChange}
        />
    );
}

export default React.memo(ZoomControl);
