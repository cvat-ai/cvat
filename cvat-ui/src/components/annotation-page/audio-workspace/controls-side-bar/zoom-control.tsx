import React from 'react';
import Icon from '@ant-design/icons';
import { AudioZoomIcon } from 'icons';

import { ZOOM_MIN } from '../utils/zoom-bounds';
import AudioSliderControl from './audio-slider-control';

export interface Props {
    zoom: number;
    maxZoom: number;
    onZoomChange(zoom: number): void;
}

function ZoomControl(props: Props): JSX.Element {
    const { zoom, maxZoom, onZoomChange } = props;
    const safeMax = Math.max(ZOOM_MIN + 1, maxZoom);

    const currentZoom = Math.min(zoom, safeMax);

    return (
        <AudioSliderControl
            icon={<Icon component={AudioZoomIcon} />}
            tooltip='Zoom'
            value={currentZoom}
            min={ZOOM_MIN}
            max={safeMax}
            step={1}
            formatValue={(v) => `${v}x`}
            className='cvat-audio-zoom-control'
            valueBadge={`x${currentZoom}`}
            onChange={onZoomChange}
        />
    );
}

export default React.memo(ZoomControl);
