// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import {
    audioActions,
    requestPlayAudioIntervalOnce,
} from 'actions/audio-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

import {
    intervalToTimeRange, clientIDFromWaveRegionId, selectAudioIntervals,
} from '../utils/audio-interval';
import { WaveformRegionRuntime } from './use-audio-waveform';
import { WaveformViewport } from './use-waveform-viewport';
import { useRegionContextMenu } from './use-region-context-menu';

const HOVER_DELTA_THRESHOLD = 2;

function isIntervalRegionTarget(region: Region): boolean {
    return clientIDFromWaveRegionId(region.id) !== null;
}

interface Params {
    regionRuntime: WaveformRegionRuntime;
    viewport: WaveformViewport;
    ready: boolean;
}

/**
 * Resolves waveform region interactions to audio intervals.
 */
export function useRegionSelection({ regionRuntime, viewport, ready }: Params): void {
    const dispatch = useDispatch<ThunkDispatch>();
    const { activeControl, hoveredIntervalID } = useSelector((state: CombinedState) => ({
        activeControl: state.annotation.canvas.activeControl,
        hoveredIntervalID: state.audio.player.hoveredIntervalID,
    }), shallowEqual);
    const intervals = useSelector(selectAudioIntervals);
    const job = useSelector((state: CombinedState) => state.annotation.job.instance);
    const latestRef = useRef({ activeControl, hoveredIntervalID });
    latestRef.current = {
        activeControl, hoveredIntervalID,
    };
    const intervalsRef = useRef(intervals);
    intervalsRef.current = intervals;
    const jobRef = useRef(job);
    jobRef.current = job;
    const hoverGuardRef = useRef<object | null>(null);
    const selectionGuardRef = useRef<object | null>(null);
    const lastHoverPointRef = useRef<{ x: number; y: number } | null>(null);

    // TODO: rework to use semantic interval selection instead of just event target
    const { attachRegionContextMenu, cleanupRegionContextMenu } = useRegionContextMenu((clientID, event) => {
        if (clientID === null) return;
        dispatch(audioActions.setAudioActiveInterval(clientID));
        dispatch(audioActions.updateAudioContextMenu(event.clientX, event.clientY, clientID));
    });

    // bind semantic interval selection
    useEffect(() => {
        if (!ready) return undefined;

        const { regionsPlugin } = regionRuntime;
        const intervalRange = (clientID: number): { start: number; end: number } | null => {
            const interval = intervalsRef.current.find((item) => item.clientID === clientID);
            return interval ? intervalToTimeRange(interval) : null;
        };
        const selectInterval = async (region: Region, event: MouseEvent): Promise<number | null> => {
            if (!isIntervalRegionTarget(region)) return null;

            const directID = clientIDFromWaveRegionId(region.id);
            if (latestRef.current.activeControl !== ActiveControl.CURSOR) {
                return directID;
            }

            const time = viewport.clientXToTime(event.clientX);
            if (time === null) return directID;

            const guard = {};
            selectionGuardRef.current = guard;
            const currentJob = jobRef.current;
            let clientID: number | null = null;
            if (currentJob) {
                const { state } = await currentJob.annotations.selectInterval(intervalsRef.current, time * 1000);
                clientID = state?.clientID ?? null;
            }
            if (selectionGuardRef.current !== guard) return null;

            dispatch(audioActions.setAudioActiveInterval(clientID));
            return clientID;
        };
        const registerRegionContextMenu = (region: Region): void => {
            if (!isIntervalRegionTarget(region)) return;
            attachRegionContextMenu(region);
        };

        const onRegionCreated = (region: Region): void => {
            registerRegionContextMenu(region);
        };

        const onRegionClicked = (region: Region, event: MouseEvent): void => {
            if (!isIntervalRegionTarget(region)) return;

            event.stopPropagation();
            event.preventDefault();
            if (event.detail >= 2 || latestRef.current.activeControl !== ActiveControl.CURSOR) return;

            selectInterval(region, event).then((clientID) => {
                if (clientID !== null) {
                    const time = viewport.clientXToTime(event.clientX);
                    if (time !== null) {
                        dispatch(audioActions.seekAudio(time));
                    }
                }
            }).catch(() => {});
        };

        const onRegionDoubleClicked = (region: Region, event: MouseEvent): void => {
            if (!isIntervalRegionTarget(region)) return;
            event.stopPropagation();
            event.preventDefault();
            selectInterval(region, event).then((clientID) => {
                if (clientID === null) return;

                const range = intervalRange(clientID);
                if (range) {
                    viewport.centerTimeRange(range);
                }

                dispatch(requestPlayAudioIntervalOnce(clientID));
            }).catch(() => {});
        };

        const onRegionRemoved = (region: Region): void => {
            cleanupRegionContextMenu(region.id);
        };

        regionsPlugin.getRegions().forEach(registerRegionContextMenu);

        regionsPlugin.on('region-created', onRegionCreated);
        regionsPlugin.on('region-clicked', onRegionClicked);
        regionsPlugin.on('region-double-clicked', onRegionDoubleClicked);
        regionsPlugin.on('region-removed', onRegionRemoved);
        return () => {
            selectionGuardRef.current = null;
            regionsPlugin.un('region-created', onRegionCreated);
            regionsPlugin.un('region-clicked', onRegionClicked);
            regionsPlugin.un('region-double-clicked', onRegionDoubleClicked);
            regionsPlugin.un('region-removed', onRegionRemoved);
        };
    }, [ready]);

    // bind semantic interval hover
    useEffect(() => {
        if (!ready) return undefined;
        const element = viewport.containerRef.current;
        if (!element) return undefined;

        const onMouseMove = (event: MouseEvent): void => {
            if (latestRef.current.activeControl !== ActiveControl.CURSOR) return;
            const lastPoint = lastHoverPointRef.current;
            const hoverDelta = lastPoint ?
                Math.hypot(event.clientX - lastPoint.x, event.clientY - lastPoint.y) : null;
            if (hoverDelta !== null && hoverDelta <= HOVER_DELTA_THRESHOLD) {
                return;
            }
            lastHoverPointRef.current = { x: event.clientX, y: event.clientY };
            const time = viewport.clientXToTime(event.clientX);
            if (time === null) return;
            const guard = {};
            hoverGuardRef.current = guard;

            // semantically select interval instead of just by event target
            // important for overlapping/nested intervals
            const currentJob = jobRef.current;
            if (!currentJob) return;
            currentJob.annotations.selectInterval(intervalsRef.current, time * 1000).then(({ state }) => {
                const clientID = state?.clientID ?? null;
                if (hoverGuardRef.current !== guard || clientID === latestRef.current.hoveredIntervalID) {
                    return;
                }

                dispatch(audioActions.setAudioHoveredInterval(clientID));
            }).catch(() => {});
        };
        const onMouseLeave = (): void => {
            lastHoverPointRef.current = null;
            hoverGuardRef.current = null;
            if (latestRef.current.hoveredIntervalID !== null) {
                dispatch(audioActions.setAudioHoveredInterval(null));
            }
        };

        element.addEventListener('mousemove', onMouseMove);
        element.addEventListener('mouseleave', onMouseLeave);
        return () => {
            hoverGuardRef.current = null;
            element.removeEventListener('mousemove', onMouseMove);
            element.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [ready]);
}
