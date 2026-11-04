// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
    changeAudioIntervalLabelAsync,
    updateAudioIntervalAsync,
} from 'actions/audio-actions';
import AudioRegionDetails from 'audio/components/annotation-page/audio-workspace/audio-region-details';
import { CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { getAudioRegionColor } from 'audio/components/annotation-page/audio-workspace/audio-region-colors';

function AudioRegionDetailsWrapper(): JSX.Element | null {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        intervals, activeIntervalID, labels, colorBy, opacity, selectedOpacity, normalizedKeyMap,
    } = useSelector((state: CombinedState) => ({
        intervals: state.audio.player.intervals,
        activeIntervalID: state.audio.player.activeIntervalID,
        labels: state.annotation.job.labels,
        colorBy: state.settings.shapes.colorBy,
        opacity: state.settings.shapes.opacity,
        selectedOpacity: state.settings.shapes.selectedOpacity,
        normalizedKeyMap: state.shortcuts.normalizedKeyMap,
    }), shallowEqual);
    const interval = activeIntervalID === null ? null :
        intervals.find((item) => item.clientID === activeIntervalID);
    const handleChangeLabel = useCallback((labelID: number): void => {
        if (activeIntervalID !== null) {
            dispatch(changeAudioIntervalLabelAsync(activeIntervalID, labelID));
        }
    }, [activeIntervalID, dispatch]);
    const handleChangeAttribute = useCallback((attributeID: number, value: string): void => {
        if (activeIntervalID !== null) {
            dispatch(updateAudioIntervalAsync(activeIntervalID, {
                attributes: { [attributeID]: value },
            }));
        }
    }, [activeIntervalID, dispatch]);
    if (!interval) return null;
    return (
        <AudioRegionDetails
            interval={interval}
            intervalIndex={intervals.indexOf(interval)}
            labels={labels}
            onChangeLabel={handleChangeLabel}
            onChangeAttribute={handleChangeAttribute}
            colorBy={colorBy}
            regionColor={getAudioRegionColor(interval, labels, colorBy, opacity, selectedOpacity, true)}
            intervalActionShortcuts={{
                setPlaybackToStart: normalizedKeyMap.AUDIO_SET_PLAYBACK_TO_INTERVAL_START,
                playInterval: normalizedKeyMap.AUDIO_PLAY_INTERVAL_ONCE,
                setPlaybackToEnd: normalizedKeyMap.AUDIO_SET_PLAYBACK_TO_INTERVAL_END,
                switchLock: normalizedKeyMap.AUDIO_SWITCH_LOCK,
                switchPinned: normalizedKeyMap.AUDIO_SWITCH_PINNED,
                switchHidden: normalizedKeyMap.AUDIO_SWITCH_HIDDEN,
            }}
        />
    );
}

export default React.memo(AudioRegionDetailsWrapper);
