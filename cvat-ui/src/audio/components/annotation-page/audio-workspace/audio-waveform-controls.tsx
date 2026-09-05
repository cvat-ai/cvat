// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Button from 'antd/lib/button';
import { AimOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    centerPlaybackPosition(): void;
}

function AudioWaveformControls({
    centerPlaybackPosition,
}: Props): JSX.Element {
    return (
        <div className='cvat-audio-waveform-controls'>
            <CVATTooltip title='Center waveform on playback position' placement='left'>
                <Button
                    className='cvat-audio-btn'
                    type='text'
                    size='small'
                    icon={<AimOutlined />}
                    aria-label='Center waveform on playback position'
                    onClick={centerPlaybackPosition}
                />
            </CVATTooltip>
        </div>
    );
}

export default React.memo(AudioWaveformControls);
