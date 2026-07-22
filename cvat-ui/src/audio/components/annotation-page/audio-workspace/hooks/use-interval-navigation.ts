// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useDispatch, useSelector } from 'react-redux';

import { audioActions } from 'actions/audio-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { Handlers, KeyMap } from 'utils/mousetrap-react';
import { subKeyMap } from 'utils/component-subkeymap';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

import { intervalEndSeconds, intervalStartSeconds } from '../utils/audio-interval';
import { WaveformViewport } from './use-waveform-viewport';

const componentShortcuts = {
    NEXT_OBJECT: {
        name: 'Next object',
        description: 'Go to the next audio interval and center it on the waveform',
        sequences: ['tab'],
        scope: ShortcutScope.ANNOTATION_PAGE,
    },
    PREVIOUS_OBJECT: {
        name: 'Previous object',
        description: 'Go to the previous audio interval and center it on the waveform',
        sequences: ['shift+tab'],
        scope: ShortcutScope.ANNOTATION_PAGE,
    },
};

registerComponentShortcuts(componentShortcuts);

export interface HotkeyBindings {
    keyMap: KeyMap;
    handlers: Handlers;
}

export interface IntervalNavigation {
    shortcuts: HotkeyBindings;
}

interface Params {
    viewport: WaveformViewport;
}

export function useIntervalNavigation({ viewport }: Params): IntervalNavigation {
    const dispatch = useDispatch<ThunkDispatch>();
    const { centerTimeRange } = viewport;
    const {
        intervals, activeIntervalID, activeControl, keyMap,
    } = useSelector((state: CombinedState) => ({
        intervals: state.audio.player.intervals,
        activeIntervalID: state.audio.player.activeIntervalID,
        activeControl: state.annotation.canvas.activeControl,
        keyMap: state.shortcuts.keyMap,
    }), shallowEqual);
    const navigate = (step: -1 | 1): void => {
        const visibleIntervals = intervals.filter((interval) => !interval.hidden);
        if (
            activeControl === ActiveControl.AUDIO_REGION_CREATE ||
            activeControl === ActiveControl.AUDIO_REGION_RECORD ||
            visibleIntervals.length === 0
        ) {
            return;
        }

        const currentIndex = visibleIntervals.findIndex((interval) => interval.clientID === activeIntervalID);
        let nextIndex = (currentIndex + step + visibleIntervals.length) % visibleIntervals.length;
        if (currentIndex < 0) {
            nextIndex = step > 0 ? 0 : visibleIntervals.length - 1;
        }
        const interval = visibleIntervals[nextIndex];
        if (interval.clientID === activeIntervalID) return;

        dispatch(audioActions.setAudioActiveInterval(interval.clientID));
        centerTimeRange({
            start: intervalStartSeconds(interval),
            end: intervalEndSeconds(interval),
        });
    };
    const handlers: Handlers = {
        NEXT_OBJECT: (event?: KeyboardEvent) => {
            event?.preventDefault();
            navigate(1);
        },
        PREVIOUS_OBJECT: (event?: KeyboardEvent) => {
            event?.preventDefault();
            navigate(-1);
        },
    };

    return {
        shortcuts: {
            keyMap: subKeyMap(componentShortcuts, keyMap),
            handlers,
        },
    };
}
