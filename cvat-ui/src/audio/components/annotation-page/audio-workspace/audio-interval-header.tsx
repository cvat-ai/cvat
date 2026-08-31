// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import classNames from 'classnames';

import { AudioIntervalState, Label } from 'cvat-core-wrapper';
import { formatMilliseconds, formatTimeShort } from 'audio/utils/format-audio-time';
import { ColorBy } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import LabelSelector from 'components/label-selector/label-selector';
import AudioIntervalActions, { AudioIntervalActionShortcuts } from './audio-interval-actions';
import AudioIntervalMoreActions from './audio-interval-more-actions';
import { intervalDurationSeconds, intervalEndSeconds, intervalStartSeconds } from './utils/audio-interval';

interface Props {
    interval: AudioIntervalState;
    intervalIndex: number;
    labels: Label[];
    isReadonly: boolean;
    showSource: boolean;
    colorBy: ColorBy;
    shortcuts: AudioIntervalActionShortcuts;
    isCompact?: boolean;
    canPlayInterval?: boolean;
    onChangeLabel(labelID: number): void;
}

export default function AudioIntervalHeader({
    interval,
    intervalIndex,
    labels,
    isReadonly,
    showSource,
    colorBy,
    shortcuts,
    isCompact = false,
    canPlayInterval = true,
    onChangeLabel,
}: Props): JSX.Element {
    const source = showSource && interval.source && String(interval.source).toLowerCase() !== 'manual' ?
        interval.source :
        null;
    const start = intervalStartSeconds(interval);
    const end = intervalEndSeconds(interval);
    const duration = intervalDurationSeconds(interval);

    const labelSelector = (
        <CVATTooltip title='Change current label'>
            <LabelSelector
                size='small'
                className='cvat-audio-interval-header-label-selector'
                popupClassName='cvat-audio-interval-header-label-dropdown'
                popupMatchSelectWidth={false}
                labels={labels}
                value={interval.label.id ?? null}
                disabled={isReadonly}
                onChange={(label: Label) => {
                    if (label.id != null) {
                        onChangeLabel(label.id);
                    }
                }}
            />
        </CVATTooltip>
    );
    const sourceLabel = source ? (
        <span className='cvat-audio-interval-header-source' title={`Source: ${source}`}>
            ({source})
        </span>
    ) : null;
    const time = (
        <div className='cvat-audio-interval-header-time'>
            {`${formatTimeShort(start)} → ${formatTimeShort(end)} (${formatMilliseconds(duration * 1000)})`}
        </div>
    );

    const topActions = isCompact ? (
        <Col flex='none' className='cvat-audio-interval-header-more-actions'>
            <AudioIntervalMoreActions interval={interval} colorBy={colorBy} />
        </Col>
    ) : (
        <Col flex='none'>
            <AudioIntervalActions
                interval={interval}
                canPlayInterval={canPlayInterval}
                shortcuts={shortcuts}
                more={<AudioIntervalMoreActions interval={interval} colorBy={colorBy} />}
            />
        </Col>
    );

    return (
        <div
            className={classNames('cvat-audio-interval-header', {
                'cvat-audio-interval-header-compact': isCompact,
            })}
        >
            <Row className='cvat-audio-interval-header-top' align='middle' gutter={4} wrap={false}>
                <Col flex='none'>
                    <span className='cvat-audio-interval-header-index'>{intervalIndex + 1}</span>
                </Col>
                <Col flex='auto' className='cvat-audio-interval-header-label'>
                    <Row className='cvat-audio-interval-header-label-row' align='middle' gutter={4} wrap={false}>
                        <Col className='cvat-audio-interval-header-label-col'>
                            {labelSelector}
                        </Col>
                        {sourceLabel ? <Col>{sourceLabel}</Col> : null}
                    </Row>
                </Col>
                {topActions}
            </Row>
            {isCompact ? (
                <Row className='cvat-audio-interval-header-compact-actions' justify='center'>
                    <Col>
                        <AudioIntervalActions
                            interval={interval}
                            canPlayInterval={canPlayInterval}
                            shortcuts={shortcuts}
                        />
                    </Col>
                </Row>
            ) : null}
            <Row>
                <Col flex='auto'>{time}</Col>
            </Row>
        </div>
    );
}
