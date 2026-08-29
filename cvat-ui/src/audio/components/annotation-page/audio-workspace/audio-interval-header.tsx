// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { AudioIntervalState, Label } from 'cvat-core-wrapper';
import { formatMilliseconds, formatTimeShort } from 'audio/utils/format-audio-time';
import { intervalDurationSeconds, intervalEndSeconds, intervalStartSeconds } from './utils/audio-interval';
import AudioIntervalLabelSelector from './audio-interval-label-selector';

interface Props {
    interval: AudioIntervalState;
    intervalIndex: number;
    labels: Label[];
    isReadonly: boolean;
    showSource: boolean;
    actions: React.ReactNode;
    onChangeLabel(labelID: number): void;
}

export default function AudioIntervalHeader({
    interval,
    intervalIndex,
    labels,
    isReadonly,
    showSource,
    actions,
    onChangeLabel,
}: Props): JSX.Element {
    const activeLabel = interval.label.id != null ? labels.find((label) => label.id === interval.label.id) : null;
    const source = showSource && interval.source && String(interval.source).toLowerCase() !== 'manual' ?
        interval.source :
        null;
    const start = intervalStartSeconds(interval);
    const end = intervalEndSeconds(interval);
    const duration = intervalDurationSeconds(interval);

    return (
        <div className='cvat-audio-interval-header'>
            <div className='cvat-audio-interval-header-top'>
                <span className='cvat-audio-interval-header-index'>{intervalIndex + 1}</span>
                <div className='cvat-audio-interval-header-label'>
                    <AudioIntervalLabelSelector
                        labels={labels}
                        activeLabel={activeLabel}
                        isReadonly={isReadonly}
                        onChangeLabel={onChangeLabel}
                    />
                    {source ? (
                        <span className='cvat-audio-interval-header-source' title={`Source: ${source}`}>
                            ({source})
                        </span>
                    ) : null}
                </div>
                {actions}
            </div>
            <div className='cvat-audio-interval-header-time'>
                {`${formatTimeShort(start)} → ${formatTimeShort(end)} (${formatMilliseconds(duration * 1000)})`}
            </div>
        </div>
    );
}
