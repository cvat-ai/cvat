// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import Icon, { LockFilled } from '@ant-design/icons';
import Button from 'antd/lib/button';
import { Col, Row } from 'antd/lib/grid';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';
import { useDispatch, useSelector } from 'react-redux';

import { AudioIntervalState } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import {
    audioActions,
    getAudioSplitContextAtPlaybackPosition,
    splitAudioIntervalAtPlaybackPositionAsync,
} from 'actions/audio-actions';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { SplitIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import { formatMilliseconds } from 'audio/utils/format-audio-time';
import { isAudioIntervalSplittableAtPlaybackPosition } from 'audio/utils/audio-interval';

export interface Props {
    shortcut: string;
}

interface SplitChooserState {
    playbackPosition: number;
    duration: number;
    candidates: AudioIntervalState[];
}

const componentShortcuts = {
    SPLIT_AUDIO_INTERVAL_AT_PLAYBACK_POSITION: {
        name: 'Split audio interval at playback position',
        description: 'Split the interval at the current playback position',
        sequences: ['alt+m'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function SplitAtPlayheadControl({ shortcut }: Props): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        intervals, keyMap,
    } = useSelector((state: CombinedState) => ({
        intervals: state.audio.player.intervals,
        keyMap: state.shortcuts.keyMap,
    }), shallowEqual);
    const [splitChooser, setSplitChooser] = useState<SplitChooserState | null>(null);

    const clearHoveredInterval = useCallback(() => {
        dispatch(audioActions.setAudioHoveredInterval(null));
    }, []);

    const closeSplitChooser = useCallback(() => {
        setSplitChooser(null);
        clearHoveredInterval();
    }, []);

    const splitInterval = useCallback(() => {
        const splitContext = dispatch(getAudioSplitContextAtPlaybackPosition());
        if (!splitContext) return;

        const { playbackPosition, duration, candidates } = splitContext;
        const interval = candidates.length === 1 ? candidates[0] : null;

        if (
            interval?.clientID != null &&
            isAudioIntervalSplittableAtPlaybackPosition(interval, duration, playbackPosition)
        ) {
            dispatch(splitAudioIntervalAtPlaybackPositionAsync(interval.clientID, playbackPosition));
            return;
        }

        if (candidates.length) {
            setSplitChooser({ playbackPosition, duration, candidates });
        }
    }, []);

    const setHoveredInterval = useCallback((clientID: number | null) => {
        dispatch(audioActions.setAudioHoveredInterval(clientID));
    }, []);

    const handleSplitInterval = useCallback(() => {
        if (splitChooser) {
            closeSplitChooser();
            return;
        }

        splitInterval();
    }, [splitChooser]);

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SPLIT_AUDIO_INTERVAL_AT_PLAYBACK_POSITION: (event?: KeyboardEvent) => {
            event?.preventDefault();
            handleSplitInterval();
        },
    };

    const chooserContent = splitChooser ? (
        <div>
            <Row className='cvat-audio-split-popover-title'>
                <Col>
                    <Text strong>Choose interval to split</Text>
                </Col>
            </Row>
            <Row className='cvat-audio-split-popover-options'>
                <Col>
                    {splitChooser.candidates.map((interval) => {
                        const clientID = interval.clientID as number;
                        const stop = interval.stop ?? splitChooser.duration * 1000;
                        const intervalIndex = intervals.findIndex((candidate) => candidate.clientID === clientID);
                        const isDisabled = !isAudioIntervalSplittableAtPlaybackPosition(
                            interval,
                            splitChooser.duration,
                            splitChooser.playbackPosition,
                        );
                        return (
                            <Row
                                key={clientID}
                                className='cvat-audio-split-option-row'
                                onMouseEnter={() => setHoveredInterval(clientID)}
                                onMouseLeave={clearHoveredInterval}
                            >
                                <Col span={24}>
                                    <Button
                                        type='text'
                                        disabled={isDisabled}
                                        className='cvat-audio-split-option'
                                        data-interval-id={clientID}
                                        onClick={() => {
                                            closeSplitChooser();
                                            dispatch(splitAudioIntervalAtPlaybackPositionAsync(
                                                clientID,
                                                splitChooser.playbackPosition,
                                            ));
                                        }}
                                    >
                                        <Row align='middle' gutter={8} wrap={false}>
                                            <Col>
                                                <div className='cvat-audio-split-option-index'>
                                                    {intervalIndex + 1}
                                                </div>
                                            </Col>
                                            <Col>
                                                <div
                                                    className='cvat-audio-split-option-label-color'
                                                    style={{ backgroundColor: interval.label.color }}
                                                />
                                            </Col>
                                            <Col>
                                                <Text className='cvat-audio-split-option-label'
                                                    ellipsis={{ tooltip: { title: interval.label.name, placement: 'right' } }}>
                                                    {interval.label.name}
                                                </Text>
                                            </Col>
                                            <Col className='cvat-audio-split-option-time'>
                                                {`${formatMilliseconds(interval.start)} – ${formatMilliseconds(stop)}`}
                                            </Col>
                                            {interval.lock && (
                                                <Col className='cvat-audio-split-option-status'>
                                                    <LockFilled aria-label='Locked interval' />
                                                </Col>
                                            )}
                                        </Row>
                                    </Button>
                                </Col>
                            </Row>
                        );
                    })}
                </Col>
            </Row>
        </div>
    ) : null;

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <CVATTooltip title={`Split interval at playback position ${shortcut}`} placement='right'>
                <Popover
                    content={chooserContent}
                    trigger='click'
                    placement='right'
                    open={splitChooser !== null}
                    onOpenChange={(open) => {
                        if (!open) closeSplitChooser();
                    }}
                    overlayClassName='cvat-audio-split-popover'
                >
                    <Icon
                        component={SplitIcon}
                        className='cvat-audio-split-control'
                        onClick={handleSplitInterval}
                    />
                </Popover>
            </CVATTooltip>
        </>
    );
}

export default React.memo(SplitAtPlayheadControl);
