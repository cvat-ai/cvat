// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import {
    AudioIntervalState, FramesMetaData, Job, Source, fetchAndAssembleAudio,
} from 'cvat-core-wrapper';
import { clamp } from 'utils/math';

export enum AudioActionTypes {
    SWITCH_AUDIO_PLAY = 'SWITCH_AUDIO_PLAY',
    PLAY_WHOLE_AUDIO = 'PLAY_WHOLE_AUDIO',
    REPORT_AUDIO_CURRENT_TIME = 'REPORT_AUDIO_CURRENT_TIME',
    SEEK_AUDIO = 'SEEK_AUDIO',
    COMPLETE_AUDIO_SEEK = 'COMPLETE_AUDIO_SEEK',
    SET_AUDIO_DURATION = 'SET_AUDIO_DURATION',
    SET_AUDIO_PLAYBACK_RATE = 'SET_AUDIO_PLAYBACK_RATE',
    SET_AUDIO_ZOOM = 'SET_AUDIO_ZOOM',
    SET_AUDIO_VOLUME = 'SET_AUDIO_VOLUME',
    SET_AUDIO_LOOP = 'SET_AUDIO_LOOP',
    SET_AUDIO_ACTIVE_INTERVAL = 'SET_AUDIO_ACTIVE_INTERVAL',
    SET_AUDIO_HOVERED_INTERVAL = 'SET_AUDIO_HOVERED_INTERVAL',
    UPDATE_AUDIO_CONTEXT_MENU = 'UPDATE_AUDIO_CONTEXT_MENU',
    LOAD_AUDIO_DATA = 'LOAD_AUDIO_DATA',
    LOAD_AUDIO_DATA_SUCCESS = 'LOAD_AUDIO_DATA_SUCCESS',
    LOAD_AUDIO_DATA_FAILED = 'LOAD_AUDIO_DATA_FAILED',
    RELEASE_AUDIO_DATA = 'RELEASE_AUDIO_DATA',
    SET_WAVEFORM_READY = 'SET_WAVEFORM_READY',
    SET_AUDIO_ACTIVE_LABEL = 'SET_AUDIO_ACTIVE_LABEL',
    PLAY_AUDIO_INTERVAL_ONCE = 'PLAY_AUDIO_INTERVAL_ONCE',
    COMPLETE_PLAY_AUDIO_INTERVAL_ONCE = 'COMPLETE_PLAY_AUDIO_INTERVAL_ONCE',
    BEGIN_AUDIO_INTERVAL_SELECTION = 'BEGIN_AUDIO_INTERVAL_SELECTION',
    COMPLETE_AUDIO_INTERVAL_SELECTION = 'COMPLETE_AUDIO_INTERVAL_SELECTION',
    AUDIO_UNDO = 'AUDIO_UNDO',
    AUDIO_REDO = 'AUDIO_REDO',
}

export const audioActions = {
    switchAudioPlay: (playing: boolean) => (
        createAction(AudioActionTypes.SWITCH_AUDIO_PLAY, { playing })
    ),
    playWholeAudio: () => createAction(AudioActionTypes.PLAY_WHOLE_AUDIO),
    reportAudioCurrentTime: (time: number) => (
        createAction(AudioActionTypes.REPORT_AUDIO_CURRENT_TIME, { time })
    ),
    seekAudio: (time: number) => (
        createAction(AudioActionTypes.SEEK_AUDIO, { request: { time } })
    ),
    completeAudioSeek: (request: { time: number }) => (
        createAction(AudioActionTypes.COMPLETE_AUDIO_SEEK, { request })
    ),
    setAudioDuration: (duration: number) => (
        createAction(AudioActionTypes.SET_AUDIO_DURATION, { duration })
    ),
    setAudioPlaybackRate: (rate: number) => (
        createAction(AudioActionTypes.SET_AUDIO_PLAYBACK_RATE, { rate })
    ),
    setAudioZoom: (zoom: number) => (
        createAction(AudioActionTypes.SET_AUDIO_ZOOM, { zoom })
    ),
    setAudioLoop: (loop: boolean) => (
        createAction(AudioActionTypes.SET_AUDIO_LOOP, { loop })
    ),
    setAudioVolume: (volume: number) => (
        createAction(AudioActionTypes.SET_AUDIO_VOLUME, { volume })
    ),
    setAudioActiveInterval: (clientID: number | null) => (
        createAction(AudioActionTypes.SET_AUDIO_ACTIVE_INTERVAL, { clientID })
    ),
    setAudioHoveredInterval: (clientID: number | null) => (
        createAction(AudioActionTypes.SET_AUDIO_HOVERED_INTERVAL, { clientID })
    ),
    updateAudioContextMenu: (left: number, top: number, clientID: number | null = null) => (
        createAction(AudioActionTypes.UPDATE_AUDIO_CONTEXT_MENU, {
            left, top, clientID,
        })
    ),
    loadAudioData: (request: object) => (
        createAction(AudioActionTypes.LOAD_AUDIO_DATA, { request })
    ),
    loadAudioDataSuccess: (request: object, audioUrl: string) => (
        createAction(AudioActionTypes.LOAD_AUDIO_DATA_SUCCESS, { request, audioUrl })
    ),
    loadAudioDataFailed: (request: object, error: string) => (
        createAction(AudioActionTypes.LOAD_AUDIO_DATA_FAILED, { request, error })
    ),
    setWaveformReady: (sourceURL: string, ready: boolean) => (
        createAction(AudioActionTypes.SET_WAVEFORM_READY, { sourceURL, ready })
    ),
    setAudioActiveLabel: (labelId: number | null) => (
        createAction(AudioActionTypes.SET_AUDIO_ACTIVE_LABEL, { labelId })
    ),
    playAudioIntervalOnce: (request: { intervalID: number }) => (
        createAction(AudioActionTypes.PLAY_AUDIO_INTERVAL_ONCE, { request })
    ),
    completePlayAudioIntervalOnce: (request: { intervalID: number }) => (
        createAction(AudioActionTypes.COMPLETE_PLAY_AUDIO_INTERVAL_ONCE, { request })
    ),
    beginAudioIntervalSelection: (request: object) => (
        createAction(AudioActionTypes.BEGIN_AUDIO_INTERVAL_SELECTION, { request })
    ),
    completeAudioIntervalSelection: (request: object, clientID: number | null) => (
        createAction(AudioActionTypes.COMPLETE_AUDIO_INTERVAL_SELECTION, { request, clientID })
    ),
    audioUndo: () => createAction(AudioActionTypes.AUDIO_UNDO),
    audioRedo: () => createAction(AudioActionTypes.AUDIO_REDO),
};

export type AudioActions = ActionUnion<typeof audioActions>;

export function toggleAudioPlayback(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { playing, playIntervalOnceRequest } = getState().audio.player;
        if (playing) {
            dispatch(audioActions.switchAudioPlay(false));
        } else if (playIntervalOnceRequest) {
            dispatch(audioActions.switchAudioPlay(true));
        } else {
            dispatch(audioActions.playWholeAudio());
        }
    };
}

export type AudioSeekIntent =
    | { kind: 'boundary'; boundary: 'start' | 'end' }
    | { kind: 'step'; direction: -1 | 1; size: 'short' | 'long' };

const AUDIO_SHORT_JUMP_FRACTION = 0.005;
const AUDIO_LONG_JUMP_FRACTION = 0.05;

type AudioIntervalPatch = Partial<Pick<
    AudioIntervalState,
    'start' | 'stop' | 'label' | 'attributes' | 'lock' | 'hidden' | 'color'
>>;

function applyIntervalPatch(interval: AudioIntervalState, patch: AudioIntervalPatch): void {
    const target = interval;
    if (typeof patch.start === 'number') target.start = patch.start;
    if (Object.hasOwn(patch, 'stop')) target.stop = patch.stop as number | null;
    if (patch.label) target.label = patch.label;
    if (patch.attributes) target.attributes = patch.attributes;
    if (typeof patch.lock === 'boolean') target.lock = patch.lock;
    if (typeof patch.hidden === 'boolean') target.hidden = patch.hidden;
    if (typeof patch.color === 'string') target.color = patch.color;
}

async function dispatchFetchAnnotations(dispatch: ThunkDispatch): Promise<void> {
    const { fetchAnnotationsAsync } = await import('./annotation-actions');
    await dispatch(fetchAnnotationsAsync());
}

export function loadAudioDataAsync(job: Job, jobMeta: FramesMetaData): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const prevAudioUrl = getState().audio.player.audioUrl;
        if (prevAudioUrl) {
            URL.revokeObjectURL(prevAudioUrl);
        }

        // use request object as request identity to prevent applying stale responses
        const request = {};
        dispatch(audioActions.loadAudioData(request));

        try {
            const totalFrames = jobMeta.size;
            const { chunkSize } = jobMeta;
            const blob = await fetchAndAssembleAudio(job.id, totalFrames, chunkSize);
            const audioUrl = URL.createObjectURL(blob);

            // clean up and exit right away if stale
            if (getState().audio.player.audioLoadRequest !== request) {
                URL.revokeObjectURL(audioUrl);
                return;
            }

            dispatch(audioActions.loadAudioDataSuccess(request, audioUrl));
        } catch (error) {
            if (getState().audio.player.audioLoadRequest === request) {
                dispatch(audioActions.loadAudioDataFailed(
                    request,
                    error instanceof Error ? error.message : String(error),
                ));
            }
        }
    };
}

export function requestAudioSeekByIntent(intent: AudioSeekIntent): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { currentTime, duration, zoom } = getState().audio.player;
        if (duration <= 0) return;

        let target: number;
        if (intent.kind === 'boundary') {
            target = intent.boundary === 'start' ? 0 : duration;
        } else {
            const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
            const fraction = intent.size === 'short' ? AUDIO_SHORT_JUMP_FRACTION : AUDIO_LONG_JUMP_FRACTION;
            target = currentTime + intent.direction * ((duration / safeZoom) * fraction);
        }

        dispatch(audioActions.seekAudio(clamp(target, 0, duration)));
    };
}

export function requestPlayAudioIntervalOnce(clientID: number): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const interval = getState().audio.player.intervals.find((_interval) => _interval.clientID === clientID);
        if (!interval) return;

        dispatch(audioActions.playAudioIntervalOnce({ intervalID: clientID }));
    };
}

export function selectAudioIntervalAtPositionAsync(positionMs: number): ThunkAction<Promise<number | null>> {
    return async (dispatch: ThunkDispatch, getState): Promise<number | null> => {
        const request = {};
        dispatch(audioActions.beginAudioIntervalSelection(request));
        const { instance: job } = getState().annotation.job;
        const { intervals } = getState().audio.player;
        let clientID: number | null = null;
        if (job) {
            const { state } = await job.annotations.selectInterval(intervals, positionMs);
            clientID = state?.clientID ?? null;
        }
        if (getState().audio.player.intervalSelectionRequest !== request) return null;

        dispatch(audioActions.completeAudioIntervalSelection(request, clientID));
        return clientID;
    };
}

export function createAudioIntervalAsync(start: number, stop: number, labelID: number | null): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { labels } = getState().annotation.job;
        const label = labelID !== null ? labels.find((_label) => _label.id === labelID) : null;
        if (!label) return;

        const state = AudioIntervalState.create({
            label,
            start: Math.round(start * 1000),
            stop: Math.round(stop * 1000),
            source: Source.MANUAL,
        });
        state.attributes = Object.fromEntries(label.attributes.map((attribute) => [
            attribute.id as number,
            attribute.defaultValue,
        ]));

        const { createAnnotationsAsync } = await import('./annotation-actions');
        await dispatch(createAnnotationsAsync([state]));
    };
}

export function updateAudioIntervalAsync(
    clientID: number,
    patcher: AudioIntervalPatch | ((interval: AudioIntervalState) => AudioIntervalPatch),
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { intervals } = getState().audio.player;
        const interval = intervals.find((_interval) => _interval.clientID === clientID);
        if (!interval) return;

        const patch = typeof patcher === 'function' ? patcher(interval) : patcher;
        applyIntervalPatch(interval, patch);
        await interval.save();
        await dispatchFetchAnnotations(dispatch);
    };
}

export function changeAudioIntervalLabelAsync(clientID: number, labelID: number): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { intervals } = getState().audio.player;
        const { labels } = getState().annotation.job;
        const interval = intervals.find((_interval) => _interval.clientID === clientID);
        const label = labels.find((_label) => _label.id === labelID);
        if (!interval || !label || interval.label.id === labelID) return;

        await dispatch(updateAudioIntervalAsync(clientID, { label }));
    };
}

export function updateAudioIntervalsAsync(
    clientIDs: number[],
    patcher: AudioIntervalPatch | ((interval: AudioIntervalState) => AudioIntervalPatch),
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { intervals } = getState().audio.player;
        const targets = intervals.filter((_interval) => (
            _interval.clientID !== null && clientIDs.includes(_interval.clientID)
        ));
        if (!targets.length) return;

        for (const interval of targets) {
            const patch = typeof patcher === 'function' ? patcher(interval) : patcher;
            applyIntervalPatch(interval, patch);
            await interval.save();
        }
        await dispatchFetchAnnotations(dispatch);
    };
}

export function removeAudioIntervalAsync(clientID: number, force = false): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { intervals } = getState().audio.player;
        const interval = intervals.find((_interval) => _interval.clientID === clientID);
        if (!interval) return;

        await interval.delete(force);
        dispatch(audioActions.setAudioActiveInterval(null));
        await dispatchFetchAnnotations(dispatch);
    };
}

export function copyAudioIntervalAsync(clientID: number): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { intervals } = getState().audio.player;
        const source = intervals.find((_interval) => _interval.clientID === clientID);
        if (!source) return;

        const state = AudioIntervalState.create({
            label: source.label,
            start: source.start,
            stop: source.stop,
            source: Source.MANUAL,
        });
        state.attributes = { ...source.attributes };

        const { createAnnotationsAsync } = await import('./annotation-actions');
        await dispatch(createAnnotationsAsync([state]));
    };
}

export function extendAudioIntervalFromLastAsync(labelID: number | null): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { intervals, currentTime, duration } = getState().audio.player;
        const { labels } = getState().annotation.job;
        const label = labelID !== null ? labels.find((_label) => _label.id === labelID) : null;
        if (!label) return;

        const end = Math.min(currentTime, duration || currentTime);
        const leftIntervals = intervals.filter((interval) => ((interval.stop ?? interval.start) / 1000) <= end);
        const nearestLeft = leftIntervals.length > 0 ?
            leftIntervals.reduce((best, interval) => (
                (interval.stop ?? interval.start) > (best.stop ?? best.start) ? interval : best
            )) : null;
        const start = nearestLeft ? (nearestLeft.stop ?? nearestLeft.start) / 1000 : 0;
        if (end - start <= 0.001) return;

        await dispatch(createAudioIntervalAsync(start, end, label.id ?? null));
    };
}

export function audioUndoAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { instance: jobInstance } = getState().annotation.job;
        const [undo] = getState().annotation.annotations.history.undo.slice(-1);
        if (!jobInstance || !undo) return;

        await jobInstance.actions.undo();
        await dispatchFetchAnnotations(dispatch);
        dispatch(audioActions.audioUndo());
    };
}

export function audioRedoAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { instance: jobInstance } = getState().annotation.job;
        const [redo] = getState().annotation.annotations.history.redo.slice(-1);
        if (!jobInstance || !redo) return;

        await jobInstance.actions.redo();
        await dispatchFetchAnnotations(dispatch);
        dispatch(audioActions.audioRedo());
    };
}
