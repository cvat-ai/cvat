import React from 'react';
import Icon from '@ant-design/icons';
import { AudioZoomIcon } from 'icons';

import AudioSliderControl from './audio-slider-control';

export interface Props {
    zoom: number;
    onZoomChange(zoom: number): void;
}

function ZoomControl(props: Props): JSX.Element {
    const { zoom, onZoomChange } = props;

    return (
        <AudioSliderControl
            icon={<Icon component={AudioZoomIcon} />}
            tooltip={`Zoom: ${zoom}x`}
            value={zoom}
            min={1}
            max={100}
            step={1}
            formatValue={(v) => `${v}x`}
            className='cvat-audio-zoom-control'
            onChange={onZoomChange}
        />
    );
}

export default React.memo(ZoomControl);
