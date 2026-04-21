import React from 'react';
import { connect } from 'react-redux';

import AudioRegionsList from 'components/annotation-page/audio-workspace/audio-regions-list';
import { AudioRegion, CombinedState } from 'reducers';
import {
    setAudioActiveRegion,
    setAudioHoveredRegion,
    switchAudioPlay,
    setAudioCurrentTime,
    setAudioRegions,
    toggleAudioRegionLock,
    toggleAudioRegionHidden,
    copyAudioRegionAsync,
    updateAudioRegionAsync,
} from 'actions/annotation-actions';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { Label } from 'cvat-core-wrapper';

const componentShortcuts = {
    AUDIO_SWITCH_ALL_LOCK: {
        name: 'Lock/unlock all regions',
        description: 'Change locked state for all audio regions in the side bar',
        sequences: ['t l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_LOCK: {
        name: 'Lock/unlock a region',
        description: 'Change locked state for the active audio region',
        sequences: ['l'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_ALL_HIDDEN: {
        name: 'Hide/show all regions',
        description: 'Change hidden state for all audio regions in the side bar',
        sequences: ['t h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_SWITCH_HIDDEN: {
        name: 'Hide/show a region',
        description: 'Change hidden state for the active audio region',
        sequences: ['h'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_DELETE_REGION: {
        name: 'Delete region',
        description: 'Delete the active audio region. Use shift to force delete of locked regions',
        sequences: ['del', 'shift+del'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_TO_BACKGROUND: {
        name: 'Move region to background',
        description: 'Move the active audio region to the background layer',
        sequences: ['-', '_'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    AUDIO_TO_FOREGROUND: {
        name: 'Move region to foreground',
        description: 'Move the active audio region to the foreground layer',
        sequences: ['+', '='],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
};

registerComponentShortcuts(componentShortcuts);

interface StateToProps {
    regions: AudioRegion[];
    activeRegionId: string | null;
    labels: Label[];
    colorBy: CombinedState['settings']['shapes']['colorBy'];
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
}

interface DispatchToProps {
    onSetActiveRegion(regionId: string | null): void;
    onSetHoveredRegion(regionId: string | null): void;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onToggleRegionLock(regionId: string): void;
    onToggleRegionHidden(regionId: string): void;
    onSetRegions(regions: AudioRegion[]): void;
    onCopyRegion(regionId: string): void;
    onUpdateRegion(
        regionId: string,
        patch: Partial<AudioRegion> | ((region: AudioRegion, regions: AudioRegion[]) => Partial<AudioRegion>),
    ): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { audioPlayer } = state.annotation;
    return {
        regions: audioPlayer.regions,
        activeRegionId: audioPlayer.activeRegionId,
        labels: state.annotation.job.labels,
        colorBy: state.settings.shapes.colorBy,
        keyMap: state.shortcuts.keyMap,
        normalizedKeyMap: state.shortcuts.normalizedKeyMap,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onSetActiveRegion(regionId: string | null): void {
            dispatch(setAudioActiveRegion(regionId));
        },
        onSetHoveredRegion(regionId: string | null): void {
            dispatch(setAudioHoveredRegion(regionId));
        },
        onSwitchPlay(playing: boolean): void {
            dispatch(switchAudioPlay(playing));
        },
        onSetCurrentTime(time: number): void {
            dispatch(setAudioCurrentTime(time));
        },
        onToggleRegionLock(regionId: string): void {
            dispatch(toggleAudioRegionLock(regionId));
        },
        onToggleRegionHidden(regionId: string): void {
            dispatch(toggleAudioRegionHidden(regionId));
        },
        onSetRegions(regions: AudioRegion[]): void {
            dispatch(setAudioRegions(regions));
        },
        onCopyRegion(regionId: string): void {
            dispatch(copyAudioRegionAsync(regionId));
        },
        onUpdateRegion(regionId, patch): void {
            dispatch(updateAudioRegionAsync(regionId, patch));
        },
    };
}

type Props = StateToProps & DispatchToProps;

function AudioRegionsListContainer(props: Props): JSX.Element {
    const {
        regions, activeRegionId, labels, colorBy,
        keyMap, normalizedKeyMap,
        onSetActiveRegion, onSetHoveredRegion, onSwitchPlay, onSetCurrentTime,
        onToggleRegionLock, onToggleRegionHidden, onSetRegions, onCopyRegion, onUpdateRegion,
    } = props;

    const preventDefault = (e?: KeyboardEvent): void => {
        if (e) e.preventDefault();
    };

    const activeRegion = activeRegionId ? regions.find((r) => r.id === activeRegionId) ?? null : null;
    const allLocked = regions.length > 0 && regions.every((r) => !!r.locked);
    const allHidden = regions.length > 0 && regions.every((r) => !!r.hidden);

    const handlers: Record<keyof typeof componentShortcuts, (e?: KeyboardEvent) => void> = {
        AUDIO_SWITCH_ALL_LOCK: (e) => {
            preventDefault(e);
            const locked = !allLocked;
            onSetRegions(regions.map((r) => ({ ...r, locked })));
        },
        AUDIO_SWITCH_LOCK: (e) => {
            preventDefault(e);
            if (activeRegion) onToggleRegionLock(activeRegion.id);
        },
        AUDIO_SWITCH_ALL_HIDDEN: (e) => {
            preventDefault(e);
            const hidden = !allHidden;
            onSetRegions(regions.map((r) => ({ ...r, hidden })));
        },
        AUDIO_SWITCH_HIDDEN: (e) => {
            preventDefault(e);
            if (activeRegion && !activeRegion.locked) onToggleRegionHidden(activeRegion.id);
        },
        AUDIO_DELETE_REGION: (e) => {
            preventDefault(e);
            if (!activeRegion) return;
            const force = !!(e && e.shiftKey);
            if (activeRegion.locked && !force) return;
            onSetRegions(regions.filter((r) => r.id !== activeRegion.id));
            onSetActiveRegion(null);
        },
        AUDIO_TO_BACKGROUND: (e) => {
            preventDefault(e);
            if (!activeRegion) return;
            const minZ = Math.min(...regions.map((r) => r.zOrder));
            onSetRegions(regions.map((r) => (
                r.id === activeRegion.id ? { ...r, zOrder: minZ - 1 } : r
            )));
        },
        AUDIO_TO_FOREGROUND: (e) => {
            preventDefault(e);
            if (!activeRegion) return;
            const maxZ = Math.max(...regions.map((r) => r.zOrder));
            onSetRegions(regions.map((r) => (
                r.id === activeRegion.id ? { ...r, zOrder: maxZ + 1 } : r
            )));
        },
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <AudioRegionsList
                regions={regions}
                activeRegionId={activeRegionId}
                labels={labels}
                colorBy={colorBy}
                switchLockAllShortcut={normalizedKeyMap.AUDIO_SWITCH_ALL_LOCK ?? ''}
                switchHiddenAllShortcut={normalizedKeyMap.AUDIO_SWITCH_ALL_HIDDEN ?? ''}
                onSetActiveRegion={onSetActiveRegion}
                onSetHoveredRegion={onSetHoveredRegion}
                onSwitchPlay={onSwitchPlay}
                onSetCurrentTime={onSetCurrentTime}
                onToggleRegionLock={onToggleRegionLock}
                onToggleRegionHidden={onToggleRegionHidden}
                onSetRegions={onSetRegions}
                onCopyRegion={onCopyRegion}
                onUpdateRegion={onUpdateRegion}
            />
        </>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AudioRegionsListContainer);
