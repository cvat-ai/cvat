// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Popover from 'antd/lib/popover';
import Slider from 'antd/lib/slider';
import Text from 'antd/lib/typography/Text';

import CVATTooltip from 'components/common/cvat-tooltip';

export interface AudioSliderControlProps {
    icon: React.ReactNode;
    tooltip: string;
    value: number;
    min: number;
    max: number;
    step: number;
    formatValue(v: number): string;
    className: string;
    valueBadge?: React.ReactNode;
    onChange(value: number): void;
}

function AudioSliderControl(props: AudioSliderControlProps): JSX.Element {
    const {
        icon,
        tooltip,
        value,
        min,
        max,
        step,
        formatValue,
        className,
        valueBadge,
        onChange,
    } = props;

    const [popoverVisible, setPopoverVisible] = useState(false);

    const content = (
        <div className='cvat-audio-slider-popover'>
            <Slider
                className='cvat-audio-slider-popover-slider'
                vertical
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
                reverse
            />
            <Text className='cvat-audio-slider-popover-value'>{formatValue(value)}</Text>
        </div>
    );

    return (
        <CVATTooltip title={tooltip} placement='right'>
            <Popover
                open={popoverVisible}
                onOpenChange={setPopoverVisible}
                trigger='click'
                placement='right'
                overlayClassName='cvat-audio-slider-popover-overlay'
                content={content}
            >
                <span className={className}>
                    {icon}
                    {valueBadge !== undefined && (
                        <span className='cvat-audio-slider-value-badge'>{valueBadge}</span>
                    )}
                </span>
            </Popover>
        </CVATTooltip>
    );
}

export default React.memo(AudioSliderControl);
