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
            step={1}
            formatValue={(v) => `x${v}`}
            className='cvat-audio-zoom-control'
            valueBadge={`x${currentZoom}`}
            onChange={onZoomChange}
        />
    );
}

export default React.memo(ZoomControl);
