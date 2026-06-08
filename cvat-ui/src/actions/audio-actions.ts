// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import {
    AudioIntervalState, FramesMetaData, Job, Source, fetchAndAssembleAudio,
} from 'cvat-core-wrapper';

export enum AudioActionTypes {
    SWITCH_AUDIO_PLAY = 'SWITCH_AUDIO_PLAY',
    SET_AUDIO_CURRENT_TIME = 'SET_AUDIO_CURRENT_TIME',
    SET_AUDIO_DURATION = 'SET_AUDIO_DURATION',
    SET_AUDIO_PLAYBACK_RATE = 'SET_AUDIO_PLAYBACK_RATE',
    SET_AUDIO_ZOOM = 'SET_AUDIO_ZOOM',
    SET_AUDIO_VOLUME = 'SET_AUDIO_VOLUME',
    SET_AUDIO_LOOP = 'SET_AUDIO_LOOP',
    SET_AUDIO_ACTIVE_INTERVAL = 'SET_AUDIO_ACTIVE_INTERVAL',
    SET_AUDIO_HOVERED_INTERVAL = 'SET_AUDIO_HOVERED_INTERVAL',
    LOAD_AUDIO_DATA = 'LOAD_AUDIO_DATA',
    LOAD_AUDIO_DATA_SUCCESS = 'LOAD_AUDIO_DATA_SUCCESS',
    LOAD_AUDIO_DATA_FAILED = 'LOAD_AUDIO_DATA_FAILED',
    SET_WAVEFORM_READY = 'SET_WAVEFORM_READY',
    SET_AUDIO_ACTIVE_LABEL = 'SET_AUDIO_ACTIVE_LABEL',
    AUDIO_UNDO = 'AUDIO_UNDO',
    AUDIO_REDO = 'AUDIO_REDO',
}

export const audioActions = {
    switchAudioPlay: (playing: boolean) => (
        createAction(AudioActionTypes.SWITCH_AUDIO_PLAY, { playing })
    ),
    setAudioCurrentTime: (time: number) => (
        createAction(AudioActionTypes.SET_AUDIO_CURRENT_TIME, { time })
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
    loadAudioData: () => (
        createAction(AudioActionTypes.LOAD_AUDIO_DATA)
    ),
    loadAudioDataSuccess: (audioUrl: string) => (
        createAction(AudioActionTypes.LOAD_AUDIO_DATA_SUCCESS, { audioUrl })
    ),
    loadAudioDataFailed: (error: string) => (
        createAction(AudioActionTypes.LOAD_AUDIO_DATA_FAILED, { error })
    ),
    setWaveformReady: (ready: boolean) => (
        createAction(AudioActionTypes.SET_WAVEFORM_READY, { ready })
    ),
    setAudioActiveLabel: (labelId: number | null) => (
        createAction(AudioActionTypes.SET_AUDIO_ACTIVE_LABEL, { labelId })
    ),
    audioUndo: () => createAction(AudioActionTypes.AUDIO_UNDO),
    audioRedo: () => createAction(AudioActionTypes.AUDIO_REDO),
};

export type AudioActions = ActionUnion<typeof audioActions>;

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

        dispatch(audioActions.loadAudioData());

        try {
            const totalFrames = jobMeta.size;
            const { chunkSize } = jobMeta;
            const blob = await fetchAndAssembleAudio(job.id, totalFrames, chunkSize);
            const audioUrl = URL.createObjectURL(blob);

            dispatch(audioActions.loadAudioDataSuccess(audioUrl));
        } catch (error) {
            dispatch(audioActions.loadAudioDataFailed(error instanceof Error ? error.message : String(error)));
        }
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
