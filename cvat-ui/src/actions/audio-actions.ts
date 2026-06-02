// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import {
    Job, FramesMetaData, fetchAndAssembleAudio, Source, JobState,
} from 'cvat-core-wrapper';
import type { SerializedInterval } from 'cvat-core-wrapper';
import serverProxy from 'cvat-core/src/server-proxy';
import { AudioRegion } from 'reducers';
import { pickInstanceColor } from 'components/annotation-page/audio-workspace/utils/create-audio-region';
import { updateJobAsync } from './jobs-actions';

export enum AudioActionTypes {
    SWITCH_AUDIO_PLAY = 'SWITCH_AUDIO_PLAY',
    SET_AUDIO_CURRENT_TIME = 'SET_AUDIO_CURRENT_TIME',
    SET_AUDIO_DURATION = 'SET_AUDIO_DURATION',
    SET_AUDIO_PLAYBACK_RATE = 'SET_AUDIO_PLAYBACK_RATE',
    SET_AUDIO_ZOOM = 'SET_AUDIO_ZOOM',
    SET_AUDIO_VOLUME = 'SET_AUDIO_VOLUME',
    SET_AUDIO_LOOP = 'SET_AUDIO_LOOP',
    SET_AUDIO_REGIONS = 'SET_AUDIO_REGIONS',
    SET_AUDIO_ACTIVE_REGION = 'SET_AUDIO_ACTIVE_REGION',
    SET_AUDIO_HOVERED_REGION = 'SET_AUDIO_HOVERED_REGION',
    LOAD_AUDIO_DATA = 'LOAD_AUDIO_DATA',
    LOAD_AUDIO_DATA_SUCCESS = 'LOAD_AUDIO_DATA_SUCCESS',
    LOAD_AUDIO_DATA_FAILED = 'LOAD_AUDIO_DATA_FAILED',
    SET_WAVEFORM_READY = 'SET_WAVEFORM_READY',
    SET_AUDIO_ACTIVE_LABEL = 'SET_AUDIO_ACTIVE_LABEL',
    LOAD_AUDIO_ANNOTATIONS_SUCCESS = 'LOAD_AUDIO_ANNOTATIONS_SUCCESS',
    UPDATE_AUDIO_REGION_ATTRIBUTE = 'UPDATE_AUDIO_REGION_ATTRIBUTE',
    TOGGLE_AUDIO_REGION_LOCK = 'TOGGLE_AUDIO_REGION_LOCK',
    TOGGLE_AUDIO_REGION_HIDDEN = 'TOGGLE_AUDIO_REGION_HIDDEN',
    SAVE_AUDIO_ANNOTATIONS = 'SAVE_AUDIO_ANNOTATIONS',
    SAVE_AUDIO_ANNOTATIONS_SUCCESS = 'SAVE_AUDIO_ANNOTATIONS_SUCCESS',
    SAVE_AUDIO_ANNOTATIONS_FAILED = 'SAVE_AUDIO_ANNOTATIONS_FAILED',
    LOAD_AUDIO_ANNOTATIONS_FAILED = 'LOAD_AUDIO_ANNOTATIONS_FAILED',
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
    setAudioRegions: (regions: AudioRegion[]) => (
        createAction(AudioActionTypes.SET_AUDIO_REGIONS, { regions })
    ),
    updateAudioRegionAttribute: (regionId: string, attrID: number, value: string) => (
        createAction(AudioActionTypes.UPDATE_AUDIO_REGION_ATTRIBUTE, { regionId, attrID, value })
    ),
    toggleAudioRegionLock: (regionId: string) => (
        createAction(AudioActionTypes.TOGGLE_AUDIO_REGION_LOCK, { regionId })
    ),
    toggleAudioRegionHidden: (regionId: string) => (
        createAction(AudioActionTypes.TOGGLE_AUDIO_REGION_HIDDEN, { regionId })
    ),
    setAudioActiveRegion: (regionId: string | null) => (
        createAction(AudioActionTypes.SET_AUDIO_ACTIVE_REGION, { regionId })
    ),
    setAudioHoveredRegion: (regionId: string | null) => (
        createAction(AudioActionTypes.SET_AUDIO_HOVERED_REGION, { regionId })
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
    loadAudioAnnotationsSuccess: (regions: AudioRegion[]) => (
        createAction(AudioActionTypes.LOAD_AUDIO_ANNOTATIONS_SUCCESS, { regions })
    ),
    loadAudioAnnotationsFailed: (error: any) => (
        createAction(AudioActionTypes.LOAD_AUDIO_ANNOTATIONS_FAILED, { error })
    ),
    saveAudioAnnotations: () => (
        createAction(AudioActionTypes.SAVE_AUDIO_ANNOTATIONS)
    ),
    saveAudioAnnotationsSuccess: () => (
        createAction(AudioActionTypes.SAVE_AUDIO_ANNOTATIONS_SUCCESS)
    ),
    saveAudioAnnotationsFailed: (error: any) => (
        createAction(AudioActionTypes.SAVE_AUDIO_ANNOTATIONS_FAILED, { error })
    ),
    audioUndo: () => createAction(AudioActionTypes.AUDIO_UNDO),
    audioRedo: () => createAction(AudioActionTypes.AUDIO_REDO),
};

export type AudioActions = ActionUnion<typeof audioActions>;

export const {
    switchAudioPlay,
    setAudioCurrentTime,
    setAudioDuration,
    setAudioPlaybackRate,
    setAudioZoom,
    setAudioLoop,
    setAudioVolume,
    setAudioRegions,
    updateAudioRegionAttribute,
    toggleAudioRegionLock,
    toggleAudioRegionHidden,
    setAudioActiveRegion,
    setAudioHoveredRegion,
    setWaveformReady,
    setAudioActiveLabel,
} = audioActions;

export const audioUndoAction = audioActions.audioUndo;
export const audioRedoAction = audioActions.audioRedo;

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

export function loadAudioAnnotationsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { job: { instance: jobInstance } } = getState().annotation;
        if (!jobInstance) {
            return;
        }

        try {
            const intervals: SerializedInterval[] = await jobInstance.annotations.intervals();

            const regions: AudioRegion[] = intervals.reduce<AudioRegion[]>((acc, interval, index) => {
                const startSec = interval.start / 1000;
                const stopMs = interval.stop ?? interval.start;
                const endSec = stopMs / 1000;
                if (!(endSec > startSec)) {
                    return acc;
                }
                acc.push({
                    id: `server-${interval.id}`,
                    start: startSec,
                    end: endSec,
                    labelId: interval.label_id,
                    attributes: interval.attributes.reduce<Record<number, string>>(
                        (attrs, attr) => ({ ...attrs, [attr.spec_id]: attr.value }),
                        {},
                    ),
                    serverId: interval.id,
                    source: String(interval.source),
                    group: interval.group,
                    color: pickInstanceColor(acc),
                    zOrder: index,
                    locked: false,
                    hidden: false,
                });
                return acc;
            }, []);

            dispatch(audioActions.loadAudioAnnotationsSuccess(regions));
        } catch (error) {
            dispatch(audioActions.loadAudioAnnotationsFailed(error));
        }
    };
}

export function saveAudioAnnotationsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const state = getState();
        const { job: { instance: jobInstance } } = state.annotation;
        const { regions } = state.audio.player;
        if (!jobInstance) return;

        const hasNoneLabels = regions.some((r: AudioRegion) => r.labelId === null);
        if (hasNoneLabels) return;

        dispatch(audioActions.saveAudioAnnotations());

        try {
            const intervals: SerializedInterval[] = regions.reduce<SerializedInterval[]>((acc, region: AudioRegion) => {
                const startMs = Math.max(jobInstance.startFrame, Math.round(region.start * 1000));
                const stopMs = Math.min(jobInstance.stopFrame, Math.round(region.end * 1000));
                if (stopMs <= startMs) {
                    return acc;
                }
                acc.push({
                    label_id: region.labelId as number,
                    start: startMs,
                    stop: stopMs,
                    group: region.group || 0,
                    source: (region.source || 'manual') as Source,
                    attributes: Object.entries(region.attributes || {}).map(([specId, value]) => ({
                        spec_id: Number(specId),
                        value: String(value),
                    })),
                });
                return acc;
            }, []);

            await serverProxy.annotations.updateAnnotations(
                'job',
                jobInstance.id,
                {
                    shapes: [], tracks: [], tags: [], intervals,
                },
                'put',
            );

            if (jobInstance.state === JobState.NEW) {
                await dispatch(updateJobAsync(jobInstance, { state: JobState.IN_PROGRESS }));
            }

            dispatch(audioActions.saveAudioAnnotationsSuccess());
        } catch (error) {
            dispatch(audioActions.saveAudioAnnotationsFailed(error));
            throw error;
        }
    };
}

export function updateAudioRegionAsync(
    regionId: string,
    patch: Partial<AudioRegion> | ((region: AudioRegion, regions: AudioRegion[]) => Partial<AudioRegion>),
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { regions } = getState().audio.player;
        const target = regions.find((r) => r.id === regionId);
        if (!target) return;
        const resolved = typeof patch === 'function' ? patch(target, regions) : patch;
        dispatch(setAudioRegions(regions.map((r) => (r.id === regionId ? { ...r, ...resolved } : r))));
    };
}

export function copyAudioRegionAsync(regionId: string): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { regions } = getState().audio.player;
        const source = regions.find((r) => r.id === regionId);
        if (!source) return;

        const maxZOrder = regions.length > 0 ?
            Math.max(...regions.map((r) => r.zOrder)) : 0;
        const rand = Math.random().toString(36).slice(2);
        const newId = `copy-${Date.now()}-${rand}`;
        const copied: AudioRegion = {
            ...source,
            id: newId,
            serverId: undefined,
            zOrder: maxZOrder + 1,
        };

        dispatch(setAudioRegions([...regions, copied]));
        dispatch(setAudioActiveRegion(newId));
    };
}

export function extendAudioRegionFromLastAsync(labelId: number | null): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const { regions, currentTime, duration } = getState().audio.player;
        const { labels } = getState().annotation.job;

        const end = Math.min(currentTime, duration || currentTime);
        const leftRegions = regions.filter((r) => r.end <= end);
        const nearestLeft = leftRegions.length > 0 ?
            leftRegions.reduce((best, r) => (r.end > best.end ? r : best)) : null;
        const start = nearestLeft ? nearestLeft.end : 0;
        if (end - start <= 0.001) return;

        const matchingLabel = labelId !== null ? labels.find((l) => l.id === labelId) : null;
        const defaultAttrs: Record<number, string> = {};
        if (matchingLabel) {
            matchingLabel.attributes.forEach((attr) => {
                defaultAttrs[attr.id!] = attr.defaultValue;
            });
        }

        const maxZOrder = regions.length > 0 ? Math.max(...regions.map((r) => r.zOrder)) : 0;
        const rand = Math.random().toString(36).slice(2);
        const newId = `extend-${Date.now()}-${rand}`;
        const newRegion: AudioRegion = {
            id: newId,
            start,
            end,
            labelId,
            attributes: defaultAttrs,
            source: 'manual',
            color: pickInstanceColor(regions),
            zOrder: maxZOrder + 1,
        };

        dispatch(setAudioRegions([...regions, newRegion]));
        dispatch(setAudioActiveRegion(newId));
    };
}
