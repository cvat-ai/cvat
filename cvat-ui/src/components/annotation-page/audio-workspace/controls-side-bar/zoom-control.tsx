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

    return (
        <AudioSliderControl
            icon={<Icon component={AudioZoomIcon} />}
            tooltip={`Zoom: ${zoom}x (max ${safeMax}x)`}
            value={Math.min(zoom, safeMax)}
            min={ZOOM_MIN}
            max={safeMax}
            step={1}
            formatValue={(v) => `${v}x`}
            className='cvat-audio-zoom-control'
            onChange={onZoomChange}
        />
    );
}

export default React.memo(ZoomControl);
