// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import AudioRegionsList from 'audio/components/annotation-page/audio-workspace/audio-regions-list';
import { intervalID } from 'audio/components/annotation-page/audio-workspace/utils/audio-interval';
import { ActiveControl, CombinedState } from 'reducers';
import {
    audioActions,
    copyAudioIntervalAsync,
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
};

registerComponentShortcuts(componentShortcuts);

interface StateToProps {
    intervals: AudioIntervalState[];
    filtersActive: boolean;
    activeIntervalID: number | null;
    labels: Label[];
    colorBy: CombinedState['settings']['shapes']['colorBy'];
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
}

interface DispatchToProps {
    onSetActiveInterval(clientID: number | null): void;
    onSetHoveredInterval(clientID: number | null): void;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onToggleIntervalLock(clientID: number): void;
    onToggleIntervalHidden(clientID: number): void;
    onToggleIntervalsLock(clientIDs: number[], lock: boolean): void;
    onToggleIntervalsHidden(clientIDs: number[], hidden: boolean): void;
    onCopyInterval(clientID: number): void;
    onDeleteInterval(clientID: number, force?: boolean): void;
    onChangeIntervalColor(clientID: number, color: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { player } = state.audio;
    const { labels } = state.annotation.job;
    const { filters } = state.annotation.annotations;
    return {
        intervals: player.intervals,
        filtersActive: filters.length > 0,
        activeIntervalID: player.activeIntervalID,
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
        onSwitchPlay(playing: boolean): void {
            dispatch(audioActions.switchAudioPlay(playing));
        },
        onSetCurrentTime(time: number): void {
            dispatch(audioActions.setAudioCurrentTime(time));
        },
        onToggleIntervalLock(clientID: number): void {
            dispatch(updateAudioIntervalAsync(clientID, (interval) => ({ lock: !interval.lock })));
        },
        onToggleIntervalHidden(clientID: number): void {
            dispatch(updateAudioIntervalAsync(clientID, (interval) => ({ hidden: !interval.hidden })));
        },
        onToggleIntervalsLock(clientIDs: number[], lock: boolean): void {
            dispatch(updateAudioIntervalsAsync(clientIDs, { lock }));
        },
        onToggleIntervalsHidden(clientIDs: number[], hidden: boolean): void {
            dispatch(updateAudioIntervalsAsync(clientIDs, { hidden }));
        },
        onCopyInterval(clientID: number): void {
            dispatch(copyAudioIntervalAsync(clientID));
        },
        onDeleteInterval(clientID: number, force = false): void {
            dispatch(removeAudioIntervalAsync(clientID, force));
        },
        onChangeIntervalColor(clientID: number, color: string): void {
            dispatch(updateAudioIntervalAsync(clientID, { color }));
        },
    };
}

type Props = StateToProps & DispatchToProps;

function AudioRegionsListContainer(props: Props): JSX.Element {
    const {
        intervals, filtersActive, activeIntervalID, labels, colorBy,
        activeControl,
        keyMap, normalizedKeyMap,
        onSetActiveInterval, onSetHoveredInterval, onSwitchPlay, onSetCurrentTime,
        onToggleIntervalLock, onToggleIntervalHidden, onToggleIntervalsLock, onToggleIntervalsHidden,
        onCopyInterval, onDeleteInterval, onChangeIntervalColor,
    } = props;

    const preventDefault = (e?: KeyboardEvent): void => {
        if (e) e.preventDefault();
    };

    const activeInterval = activeIntervalID !== null ?
        intervals.find((interval) => interval.clientID === activeIntervalID) ?? null : null;
    const allLocked = intervals.length > 0 && intervals.every((interval) => !!interval.lock);
    const allHidden = intervals.length > 0 && intervals.every((interval) => !!interval.hidden);
    const allIds = intervals.map((interval) => intervalID(interval));

    const handlers: Record<keyof typeof componentShortcuts, (e?: KeyboardEvent) => void> = {
        AUDIO_SWITCH_ALL_LOCK: (e) => {
            preventDefault(e);
            onToggleIntervalsLock(allIds, !allLocked);
        },
        AUDIO_SWITCH_LOCK: (e) => {
            preventDefault(e);
            if (activeInterval) onToggleIntervalLock(intervalID(activeInterval));
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
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <AudioRegionsList
                intervals={intervals}
                filtersActive={filtersActive}
                activeIntervalID={activeIntervalID}
                labels={labels}
                colorBy={colorBy}
                activeControl={activeControl}
                switchLockAllShortcut={normalizedKeyMap.AUDIO_SWITCH_ALL_LOCK ?? ''}
                switchHiddenAllShortcut={normalizedKeyMap.AUDIO_SWITCH_ALL_HIDDEN ?? ''}
                onSetActiveInterval={onSetActiveInterval}
                onSetHoveredInterval={onSetHoveredInterval}
                onSwitchPlay={onSwitchPlay}
                onSetCurrentTime={onSetCurrentTime}
                onToggleIntervalLock={onToggleIntervalLock}
                onToggleIntervalHidden={onToggleIntervalHidden}
                onToggleIntervalsLock={onToggleIntervalsLock}
                onToggleIntervalsHidden={onToggleIntervalsHidden}
                onCopyInterval={onCopyInterval}
                onDeleteInterval={onDeleteInterval}
                onChangeIntervalColor={onChangeIntervalColor}
            />
        </>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AudioRegionsListContainer);
