import React from 'react';
import Icon from '@ant-design/icons';
import { AudioVolumeIcon } from 'icons';

import AudioSliderControl from './audio-slider-control';

export interface Props {
    volume: number;
    onVolumeChange(volume: number): void;
}

function VolumeControl(props: Props): JSX.Element {
    const { volume, onVolumeChange } = props;

    return (
        <AudioSliderControl
            icon={<Icon component={AudioVolumeIcon} />}
            tooltip={`Volume: ${Math.round(volume * 100)}%`}
            value={volume}
            min={0}
            max={1}
            step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            className='cvat-audio-volume-control'
            onChange={onVolumeChange}
        />
    );
}

export default React.memo(VolumeControl);
