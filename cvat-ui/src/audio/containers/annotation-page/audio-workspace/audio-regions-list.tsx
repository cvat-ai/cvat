// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import AudioRegionsList from 'audio/components/annotation-page/audio-workspace/audio-regions-list';
import { intervalID } from 'audio/components/annotation-page/audio-workspace/utils/audio-interval';
import { ActiveControl, ColorBy, CombinedState } from 'reducers';
import {
    audioActions,
    changeAudioIntervalLabelAsync,
    requestPlayAudioIntervalOnce,
    requestSetAudioCaretToIntervalBoundary,
    removeAudioIntervalAsync,
    updateAudioIntervalAsync,
    updateAudioIntervalsAsync,
} from 'actions/audio-actions';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { AudioIntervalState, Label } from 'cvat-core-wrapper';

const componentShortcuts = {
    AUDIO_SWITCH_ALL_LOCK: {
        name: 'Lock/unlock all intervals',
        description: 'Change locked state for all audio intervals in the side bar',
        sequences: ['t l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_LOCK: {
        name: 'Lock/unlock an interval',
        description: 'Change locked state for the active audio interval',
        sequences: ['l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_ALL_PINNED: {
        name: 'Pin/unpin all intervals',
        description: 'Change pinned state for all unlocked audio intervals in the side bar',
        sequences: ['t p'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_PINNED: {
        name: 'Pin/unpin an interval',
        description: 'Change pinned state for the active audio interval',
        sequences: ['p'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_ALL_HIDDEN: {
        name: 'Hide/show all intervals',
        description: 'Change hidden state for all audio intervals in the side bar',
        sequences: ['t h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_HIDDEN: {
        name: 'Hide/show an interval',
        description: 'Change hidden state for the active audio interval',
        sequences: ['h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_DELETE_REGION: {
        name: 'Delete interval',
        description: 'Delete the active audio interval. Use shift to force delete of locked intervals',
        sequences: ['del', 'shift+del'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SET_CARET_TO_INTERVAL_START: {
        name: 'Set caret to interval start',
        description: 'Seek to the selected interval start without changing playback',
        sequences: ['['],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SET_CARET_TO_INTERVAL_END: {
        name: 'Set caret to interval end',
        description: 'Seek to the selected interval end without changing playback',
        sequences: [']'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_PLAY_INTERVAL_ONCE: {
        name: 'Play interval as range',
        description: 'Play the active audio interval once',
        sequences: ['\\'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_FIT_INTERVAL: {
        name: 'Fit interval',
        description: 'Fit the active audio interval into the waveform viewport',
        sequences: ['i'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
};

registerComponentShortcuts(componentShortcuts);

interface StateToProps {
    intervals: AudioIntervalState[];
    filtersActive: boolean;
    activeIntervalID: number | null;
    hoveredIntervalID: number | null;
    labels: Label[];
    colorBy: ColorBy;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
}

interface DispatchToProps {
    onSetActiveInterval(clientID: number | null): void;
    onSetHoveredInterval(clientID: number | null): void;
    onPlayIntervalOnce(clientID: number): void;
    onToggleIntervalLock(clientID: number): void;
    onToggleIntervalPinned(clientID: number): void;
    onToggleIntervalHidden(clientID: number): void;
    onToggleIntervalsLock(clientIDs: number[], lock: boolean): void;
    onToggleIntervalsPinned(clientIDs: number[], pinned: boolean): void;
    onToggleIntervalsHidden(clientIDs: number[], hidden: boolean): void;
    onDeleteInterval(clientID: number, force?: boolean): void;
    onSetCaret(clientID: number, boundary: 'start' | 'end'): void;
    onFitInterval(clientID: number): void;
    onChangeLabel(clientID: number, labelID: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { player } = state.audio;
    const { labels } = state.annotation.job;
    const { filters } = state.annotation.annotations;
    return {
        intervals: player.intervals,
        filtersActive: filters.length > 0,
        activeIntervalID: player.activeIntervalID,
        hoveredIntervalID: player.hoveredIntervalID,
        labels,
        colorBy: state.settings.shapes.colorBy,
        activeControl: state.annotation.canvas.activeControl,
        keyMap: state.shortcuts.keyMap,
        normalizedKeyMap: state.shortcuts.normalizedKeyMap,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onSetActiveInterval(clientID: number | null): void {
            dispatch(audioActions.setAudioActiveInterval(clientID));
        },
        onSetHoveredInterval(clientID: number | null): void {
            dispatch(audioActions.setAudioHoveredInterval(clientID));
        },
        onPlayIntervalOnce(clientID: number): void {
            dispatch(requestPlayAudioIntervalOnce(clientID));
        },
        onToggleIntervalLock(clientID: number): void {
            dispatch(updateAudioIntervalAsync(clientID, (interval) => ({ lock: !interval.lock })));
        },
        onToggleIntervalPinned(clientID: number): void {
            dispatch(updateAudioIntervalAsync(clientID, (interval) => ({ pinned: !interval.pinned })));
        },
        onToggleIntervalHidden(clientID: number): void {
            dispatch(updateAudioIntervalAsync(clientID, (interval) => ({ hidden: !interval.hidden })));
        },
        onToggleIntervalsLock(clientIDs: number[], lock: boolean): void {
            dispatch(updateAudioIntervalsAsync(clientIDs, { lock }));
        },
        onToggleIntervalsPinned(clientIDs: number[], pinned: boolean): void {
            dispatch(updateAudioIntervalsAsync(clientIDs, { pinned }));
        },
        onToggleIntervalsHidden(clientIDs: number[], hidden: boolean): void {
            dispatch(updateAudioIntervalsAsync(clientIDs, { hidden }));
        },
        onDeleteInterval(clientID: number, force = false): void {
            dispatch(removeAudioIntervalAsync(clientID, force));
        },
        onSetCaret(clientID: number, boundary: 'start' | 'end'): void {
            dispatch(requestSetAudioCaretToIntervalBoundary(clientID, boundary));
        },
        onFitInterval(clientID: number): void {
            dispatch(audioActions.fitAudioInterval(clientID));
        },
        onChangeLabel(clientID: number, labelID: number): void {
            dispatch(changeAudioIntervalLabelAsync(clientID, labelID));
        },
    };
}

type Props = StateToProps & DispatchToProps;

function AudioRegionsListContainer(props: Props): JSX.Element {
    const {
        intervals, filtersActive, activeIntervalID, hoveredIntervalID, labels, colorBy,
        activeControl,
        keyMap, normalizedKeyMap,
        onSetActiveInterval, onSetHoveredInterval, onPlayIntervalOnce,
        onToggleIntervalLock, onToggleIntervalPinned, onToggleIntervalHidden,
        onToggleIntervalsLock, onToggleIntervalsPinned, onToggleIntervalsHidden,
        onDeleteInterval, onSetCaret, onChangeLabel,
        onFitInterval,
    } = props;

    const preventDefault = (e?: KeyboardEvent): void => {
        if (e) e.preventDefault();
    };

    const activeInterval = activeIntervalID !== null ?
        intervals.find((interval) => interval.clientID === activeIntervalID) ?? null : null;
    const allLocked = intervals.length > 0 && intervals.every((interval) => !!interval.lock);
    const pinnableIntervals = intervals.filter((interval) => !interval.lock);
    const allPinned = pinnableIntervals.length > 0 && pinnableIntervals.every((interval) => !!interval.pinned);
    const allHidden = intervals.length > 0 && intervals.every((interval) => !!interval.hidden);
    const allIds = intervals.map((interval) => intervalID(interval));
    const pinnableIds = pinnableIntervals.map((interval) => intervalID(interval));

    const handlers: Record<keyof typeof componentShortcuts, (e?: KeyboardEvent) => void> = {
        AUDIO_SWITCH_ALL_LOCK: (e) => {
            preventDefault(e);
            onToggleIntervalsLock(allIds, !allLocked);
        },
        AUDIO_SWITCH_LOCK: (e) => {
            preventDefault(e);
            if (activeInterval) onToggleIntervalLock(intervalID(activeInterval));
        },
        AUDIO_SWITCH_ALL_PINNED: (e) => {
            preventDefault(e);
            onToggleIntervalsPinned(pinnableIds, !allPinned);
        },
        AUDIO_SWITCH_PINNED: (e) => {
            preventDefault(e);
            if (activeInterval && !activeInterval.lock) onToggleIntervalPinned(intervalID(activeInterval));
        },
        AUDIO_SWITCH_ALL_HIDDEN: (e) => {
            preventDefault(e);
            onToggleIntervalsHidden(allIds, !allHidden);
        },
        AUDIO_SWITCH_HIDDEN: (e) => {
            preventDefault(e);
            if (activeInterval && !activeInterval.lock) onToggleIntervalHidden(intervalID(activeInterval));
        },
        AUDIO_DELETE_REGION: (e) => {
            preventDefault(e);
            if (!activeInterval) return;
            const force = !!(e && e.shiftKey);
            if (activeInterval.lock && !force) return;
            onDeleteInterval(intervalID(activeInterval), force);
        },
        AUDIO_SET_CARET_TO_INTERVAL_START: (e) => {
            preventDefault(e);
            if (!activeInterval) return;
            onSetCaret(intervalID(activeInterval), 'start');
        },
        AUDIO_SET_CARET_TO_INTERVAL_END: (e) => {
            preventDefault(e);
            if (!activeInterval) return;
            onSetCaret(intervalID(activeInterval), 'end');
        },
        AUDIO_PLAY_INTERVAL_ONCE: (e) => {
            preventDefault(e);
            if (!activeInterval || activeInterval.hidden) return;
            onPlayIntervalOnce(intervalID(activeInterval));
        },
        AUDIO_FIT_INTERVAL: (e) => {
            preventDefault(e);
            if (!activeInterval) return;
            onFitInterval(intervalID(activeInterval));
        },
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <AudioRegionsList
                intervals={intervals}
                filtersActive={filtersActive}
                activeIntervalID={activeIntervalID}
                hoveredIntervalID={hoveredIntervalID}
                labels={labels}
                colorBy={colorBy}
                activeControl={activeControl}
                intervalActionShortcuts={{
                    setCaretToStart: normalizedKeyMap.AUDIO_SET_CARET_TO_INTERVAL_START ?? '',
                    playInterval: normalizedKeyMap.AUDIO_PLAY_INTERVAL_ONCE ?? '',
                    setCaretToEnd: normalizedKeyMap.AUDIO_SET_CARET_TO_INTERVAL_END ?? '',
                    switchLock: normalizedKeyMap.AUDIO_SWITCH_LOCK ?? '',
                    switchPinned: normalizedKeyMap.AUDIO_SWITCH_PINNED ?? '',
                    switchHidden: normalizedKeyMap.AUDIO_SWITCH_HIDDEN ?? '',
                }}
                switchLockAllShortcut={normalizedKeyMap.AUDIO_SWITCH_ALL_LOCK ?? ''}
                switchPinAllShortcut={normalizedKeyMap.AUDIO_SWITCH_ALL_PINNED ?? ''}
                switchHiddenAllShortcut={normalizedKeyMap.AUDIO_SWITCH_ALL_HIDDEN ?? ''}
                onSetActiveInterval={onSetActiveInterval}
                onSetHoveredInterval={onSetHoveredInterval}
                onPlayIntervalOnce={onPlayIntervalOnce}
                onToggleIntervalsLock={onToggleIntervalsLock}
                onToggleIntervalsPinned={onToggleIntervalsPinned}
                onToggleIntervalsHidden={onToggleIntervalsHidden}
                onChangeLabel={onChangeLabel}
            />
        </>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AudioRegionsListContainer);
