// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { AudioRegion, AudioState } from '.';

const MAX_AUDIO_HISTORY = 32;

type AudioRegionDiff =
    | { kind: 'added'; region: AudioRegion }
    | { kind: 'removed'; region: AudioRegion }
    | { kind: 'updated'; before: AudioRegion; after: AudioRegion };

interface AudioHistoryEntry {
    actionName: string;
    diffs: AudioRegionDiff[];
    activeRegionIdBefore: string | null;
    activeRegionIdAfter: string | null;
}

function cloneRegion(region: AudioRegion): AudioRegion {
    return { ...region, attributes: { ...region.attributes } };
}

function regionsEqual(a: AudioRegion, b: AudioRegion): boolean {
    if (
        a.start !== b.start || a.end !== b.end ||
        a.labelId !== b.labelId || a.zOrder !== b.zOrder ||
        a.locked !== b.locked || a.hidden !== b.hidden ||
        a.color !== b.color || a.group !== b.group ||
        a.source !== b.source || a.serverId !== b.serverId
    ) return false;
    const aKeys = Object.keys(a.attributes);
    const bKeys = Object.keys(b.attributes);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => a.attributes[k as unknown as number] === b.attributes[k as unknown as number]);
}

function diffRegions(oldRegions: AudioRegion[], newRegions: AudioRegion[]): AudioRegionDiff[] {
    const diffs: AudioRegionDiff[] = [];
    const oldById = new Map(oldRegions.map((r) => [r.id, r]));
    const newById = new Map(newRegions.map((r) => [r.id, r]));

    newById.forEach((region, id) => {
        const before = oldById.get(id);
        if (!before) {
            diffs.push({ kind: 'added', region: cloneRegion(region) });
        } else if (!regionsEqual(before, region)) {
            diffs.push({ kind: 'updated', before: cloneRegion(before), after: cloneRegion(region) });
        }
    });
    oldById.forEach((region, id) => {
        if (!newById.has(id)) diffs.push({ kind: 'removed', region: cloneRegion(region) });
    });
    return diffs;
}

function applyReverseDiffs(regions: AudioRegion[], diffs: AudioRegionDiff[]): AudioRegion[] {
    let result = regions;
    diffs.forEach((diff) => {
        if (diff.kind === 'added') {
            result = result.filter((r) => r.id !== diff.region.id);
        } else if (diff.kind === 'removed') {
            result = [...result, cloneRegion(diff.region)];
        } else {
            result = result.map((r) => (r.id === diff.after.id ? cloneRegion(diff.before) : r));
        }
    });
    return result;
}

function applyForwardDiffs(regions: AudioRegion[], diffs: AudioRegionDiff[]): AudioRegion[] {
    let result = regions;
    diffs.forEach((diff) => {
        if (diff.kind === 'added') {
            result = [...result, cloneRegion(diff.region)];
        } else if (diff.kind === 'removed') {
            result = result.filter((r) => r.id !== diff.region.id);
        } else {
            result = result.map((r) => (r.id === diff.before.id ? cloneRegion(diff.after) : r));
        }
    });
    return result;
}

function describeDiffs(diffs: AudioRegionDiff[]): string {
    const added = diffs.filter((d) => d.kind === 'added').length;
    const removed = diffs.filter((d) => d.kind === 'removed').length;
    const updated = diffs.filter((d) => d.kind === 'updated').length;
    if (added && !removed && !updated) return added === 1 ? 'Created region' : 'Created regions';
    if (removed && !added && !updated) return removed === 1 ? 'Deleted region' : 'Deleted regions';
    if (updated && !added && !removed) return updated === 1 ? 'Updated region' : 'Updated regions';
    return 'Edited regions';
}

function pushAudioUndo(
    state: AudioState,
    actionName: string,
    diffs: AudioRegionDiff[],
    activeRegionIdAfter: string | null,
): AudioState['history'] {
    if (diffs.length === 0 && state.player.activeRegionId === activeRegionIdAfter) {
        return state.history;
    }
    const entry: AudioHistoryEntry = {
        actionName,
        diffs,
        activeRegionIdBefore: state.player.activeRegionId,
        activeRegionIdAfter,
    };
    const undo = [...state.history.undo, entry].slice(-MAX_AUDIO_HISTORY);
    return { undo, redo: [] };
}

const defaultState: AudioState = {
    player: {
        playing: false,
        currentTime: 0,
        duration: 0,
        playbackRate: 1,
        zoom: 1,
        volume: 1,
        loop: false,
        regions: [],
        activeRegionId: null,
        hoveredRegionId: null,
        audioUrl: null,
        audioLoading: false,
        audioError: null,
        waveformReady: false,
        activeLabelId: null,
        hasUnsavedChanges: false,
        version: 0,
    },
    history: {
        undo: [],
        redo: [],
    },
};

export default function audioReducer(state: AudioState = defaultState, action: AnyAction): AudioState {
    switch (action.type) {
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const { job } = action.payload;
            return {
                ...state,
                player: {
                    ...state.player,
                    activeLabelId: job.labels.length ? job.labels[0].id : null,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_AUDIO_PLAY: {
            return {
                ...state,
                player: {
                    ...state.player,
                    playing: action.payload.playing,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_CURRENT_TIME: {
            return {
                ...state,
                player: {
                    ...state.player,
                    currentTime: action.payload.time,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_DURATION: {
            return {
                ...state,
                player: {
                    ...state.player,
                    duration: action.payload.duration,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_PLAYBACK_RATE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    playbackRate: action.payload.rate,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_ZOOM: {
            return {
                ...state,
                player: {
                    ...state.player,
                    zoom: action.payload.zoom,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_VOLUME: {
            return {
                ...state,
                player: {
                    ...state.player,
                    volume: action.payload.volume,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_LOOP: {
            return {
                ...state,
                player: {
                    ...state.player,
                    loop: action.payload.loop,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_REGIONS: {
            const diffs = diffRegions(state.player.regions, action.payload.regions);
            return {
                ...state,
                history: pushAudioUndo(
                    state,
                    describeDiffs(diffs),
                    diffs,
                    state.player.activeRegionId,
                ),
                player: {
                    ...state.player,
                    regions: action.payload.regions,
                    hasUnsavedChanges: true,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_AUDIO_REGION_ATTRIBUTE: {
            const { regionId, attrID, value } = action.payload;
            const before = state.player.regions.find((r) => r.id === regionId);
            if (!before) return state;
            const after: AudioRegion = {
                ...before,
                attributes: { ...before.attributes, [attrID]: value },
            };
            const diffs: AudioRegionDiff[] = [{ kind: 'updated', before: cloneRegion(before), after: cloneRegion(after) }];
            return {
                ...state,
                history: pushAudioUndo(state, 'Changed attribute', diffs, state.player.activeRegionId),
                player: {
                    ...state.player,
                    regions: state.player.regions.map((r) => (r.id === regionId ? after : r)),
                    hasUnsavedChanges: true,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_ACTIVE_REGION: {
            return {
                ...state,
                player: {
                    ...state.player,
                    activeRegionId: action.payload.regionId,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_HOVERED_REGION: {
            return {
                ...state,
                player: {
                    ...state.player,
                    hoveredRegionId: action.payload.regionId,
                },
            };
        }
        case AnnotationActionTypes.LOAD_AUDIO_DATA: {
            return {
                ...state,
                player: {
                    ...state.player,
                    audioLoading: true,
                    audioError: null,
                    waveformReady: false,
                    audioUrl: null,
                },
            };
        }
        case AnnotationActionTypes.LOAD_AUDIO_DATA_SUCCESS: {
            return {
                ...state,
                player: {
                    ...state.player,
                    audioUrl: action.payload.audioUrl,
                    audioLoading: false,
                    audioError: null,
                },
            };
        }
        case AnnotationActionTypes.LOAD_AUDIO_DATA_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    audioLoading: false,
                    audioError: action.payload.error,
                },
            };
        }
        case AnnotationActionTypes.SET_WAVEFORM_READY: {
            return {
                ...state,
                player: {
                    ...state.player,
                    waveformReady: action.payload.ready,
                },
            };
        }
        case AnnotationActionTypes.SET_AUDIO_ACTIVE_LABEL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    activeLabelId: action.payload.labelId,
                },
            };
        }
        case AnnotationActionTypes.TOGGLE_AUDIO_REGION_LOCK: {
            const { regionId } = action.payload;
            const before = state.player.regions.find((r) => r.id === regionId);
            if (!before) return state;
            const after: AudioRegion = { ...before, locked: !before.locked };
            const diffs: AudioRegionDiff[] = [{ kind: 'updated', before: cloneRegion(before), after: cloneRegion(after) }];
            return {
                ...state,
                history: pushAudioUndo(state, 'Toggled lock', diffs, state.player.activeRegionId),
                player: {
                    ...state.player,
                    regions: state.player.regions.map((r) => (r.id === regionId ? after : r)),
                    hasUnsavedChanges: true,
                },
            };
        }
        case AnnotationActionTypes.TOGGLE_AUDIO_REGION_HIDDEN: {
            const { regionId } = action.payload;
            const before = state.player.regions.find((r) => r.id === regionId);
            if (!before) return state;
            const after: AudioRegion = { ...before, hidden: !before.hidden };
            const diffs: AudioRegionDiff[] = [{ kind: 'updated', before: cloneRegion(before), after: cloneRegion(after) }];
            return {
                ...state,
                history: pushAudioUndo(state, 'Toggled visibility', diffs, state.player.activeRegionId),
                player: {
                    ...state.player,
                    regions: state.player.regions.map((r) => (r.id === regionId ? after : r)),
                    hasUnsavedChanges: true,
                },
            };
        }
        case AnnotationActionTypes.LOAD_AUDIO_ANNOTATIONS_SUCCESS: {
            return {
                ...state,
                player: {
                    ...state.player,
                    regions: action.payload.regions,
                    version: action.payload.version ?? 0,
                    hasUnsavedChanges: false,
                },
                history: { undo: [], redo: [] },
            };
        }
        case AnnotationActionTypes.SAVE_AUDIO_ANNOTATIONS_SUCCESS: {
            return {
                ...state,
                player: {
                    ...state.player,
                    hasUnsavedChanges: false,
                    version: action.payload.version ?? state.player.version,
                },
            };
        }
        case AnnotationActionTypes.AUDIO_UNDO: {
            const undoStack = [...state.history.undo];
            const entry = undoStack.pop();
            if (!entry) return state;

            return {
                ...state,
                history: {
                    undo: undoStack,
                    redo: [...state.history.redo, entry].slice(-MAX_AUDIO_HISTORY),
                },
                player: {
                    ...state.player,
                    regions: applyReverseDiffs(state.player.regions, entry.diffs),
                    activeRegionId: entry.activeRegionIdBefore,
                    hasUnsavedChanges: true,
                },
            };
        }
        case AnnotationActionTypes.AUDIO_REDO: {
            const redoStack = [...state.history.redo];
            const entry = redoStack.pop();
            if (!entry) return state;

            return {
                ...state,
                history: {
                    undo: [...state.history.undo, entry].slice(-MAX_AUDIO_HISTORY),
                    redo: redoStack,
                },
                player: {
                    ...state.player,
                    regions: applyForwardDiffs(state.player.regions, entry.diffs),
                    activeRegionId: entry.activeRegionIdAfter,
                    hasUnsavedChanges: true,
                },
            };
        }
        default:
            return state;
    }
}
