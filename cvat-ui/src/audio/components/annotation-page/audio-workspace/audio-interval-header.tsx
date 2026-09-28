// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import classNames from 'classnames';

import { Label, LabelType, Source } from 'cvat-core-wrapper';
import { formatMilliseconds, formatTimeShort } from 'audio/utils/format-audio-time';
import { ColorBy } from 'reducers';
import LabelSelector from 'components/label-selector/label-selector';
import { filterApplicableForTypes } from 'utils/filter-applicable-labels';
import AudioIntervalActions, { AudioIntervalActionShortcuts } from './audio-interval-actions';
import AudioIntervalMoreActions from './audio-interval-more-actions';
import {
    intervalDurationSeconds,
    intervalEndSeconds,
    intervalStartSeconds,
} from './utils/audio-interval';

interface Props {
    clientID: number;
    serverID: number | null;
    labelID: number | null;
    labelType: LabelType;
    start: number;
    stop: number | null;
    source: Source;
    color: string;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    intervalIndex: number;
    labels: Label[];
    showSource: boolean;
    colorBy: ColorBy;
    shortcuts: AudioIntervalActionShortcuts;
    isCompact?: boolean;
    onChangeLabel(labelID: number): void;
}

function AudioIntervalHeader({
    clientID,
    serverID,
    labelID,
    labelType,
    start,
    stop,
    source,
    color,
    locked,
    pinned,
    hidden,
    intervalIndex,
    labels,
    showSource,
    colorBy,
    shortcuts,
    isCompact = false,
    onChangeLabel,
}: Props): JSX.Element {
    const sourceLabelValue = showSource && source && String(source).toLowerCase() !== 'manual' ?
        source :
        null;
    const interval = { start, stop };
    const startSeconds = intervalStartSeconds(interval);
    const endSeconds = intervalEndSeconds(interval);
    const duration = intervalDurationSeconds(interval);
    // Old intervals may have labels that are not applicable to intervals anymore,
    // so we need to keep them in the list of labels for the selector
    const labelsForSelector = filterApplicableForTypes([LabelType.INTERVAL, labelType], labels);

    const labelSelector = (
        <LabelSelector
            size='small'
            className='cvat-audio-interval-header-label-selector'
            popupClassName='cvat-audio-interval-header-label-dropdown'
            popupMatchSelectWidth={false}
            labels={labelsForSelector}
            value={labelID}
            disabled={locked}
            tooltip='Change current label'
            onChange={(label: Label) => {
                if (label.id != null) {
                    onChangeLabel(label.id);
                }
            }}
        />
    );
    const sourceLabel = sourceLabelValue ? (
        <span className='cvat-audio-interval-header-source' title={`Source: ${sourceLabelValue}`}>
            ({sourceLabelValue})
        </span>
    ) : null;
    const formattedDuration = formatMilliseconds(duration * 1000);
    const time = (
        <div className='cvat-audio-interval-header-time'>
            {`${formatTimeShort(startSeconds)} → ${formatTimeShort(endSeconds)} (${formattedDuration})`}
        </div>
    );

    const topActions = isCompact ? (
        <Col flex='none' className='cvat-audio-interval-header-more-actions'>
            <AudioIntervalMoreActions
                clientID={clientID}
                serverID={serverID}
                locked={locked}
                color={color}
                colorBy={colorBy}
            />
        </Col>
    ) : (
        <Col flex='none'>
            <AudioIntervalActions
                clientID={clientID}
                locked={locked}
                hidden={hidden}
                pinned={pinned}
                shortcuts={shortcuts}
                more={(
                    <AudioIntervalMoreActions
                        clientID={clientID}
                        serverID={serverID}
                        locked={locked}
                        color={color}
                        colorBy={colorBy}
                    />
                )}
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
                            clientID={clientID}
                            locked={locked}
                            hidden={hidden}
                            pinned={pinned}
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

export default React.memo(AudioIntervalHeader);
