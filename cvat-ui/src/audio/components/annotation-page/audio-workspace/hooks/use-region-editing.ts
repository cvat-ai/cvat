// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { MIN_INTERVAL_DURATION, INTERVAL_BOUNDARY_EPSILON } from 'audio/utils/waveform-geometry';
import { createAudioIntervalAsync, updateAudioIntervalAsync } from 'actions/audio-actions';
import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';

import {
    clientIDFromWaveRegionId, intervalEndSeconds, intervalStartSeconds,
} from '../utils/audio-interval';
import { attachRegionAutoScroll } from '../utils/region-auto-scroll';
import { WaveformRegionRuntime } from './use-audio-waveform';
import { WaveformViewport } from './use-waveform-viewport';

const REGION_DRAG_BOUNDS_CONSTRAINT = Symbol('regionDragBoundsConstraint');
interface Params {
    regionRuntime: WaveformRegionRuntime;
    viewport: WaveformViewport;
    isPreviewRegion(region: Region): boolean;
    ready: boolean;
}

/**
 * Installs a constraint on the region's drag behavior to ensure that
 * it cannot be dragged outside of the waveform's bounds.
 */
function installRegionDragBoundsConstraint(region: Region): void {
    /* eslint-disable no-underscore-dangle */
    const internal = region as any;
    if (internal[REGION_DRAG_BOUNDS_CONSTRAINT]) return;

    const original = internal._onUpdate.bind(internal) as (
        dx: number, side?: 'start' | 'end', startTime?: number,
    ) => void;
    internal[REGION_DRAG_BOUNDS_CONSTRAINT] = true;
    internal._onUpdate = (deltaPx: number, side?: 'start' | 'end', startTime?: number): void => {
        if (side) {
            original(deltaPx, side, startTime);
            return;
        }
        const width = internal.element?.parentElement?.getBoundingClientRect().width ?? 0;
        const total = internal.totalDuration as number;
        if (!width || !total) {
            original(deltaPx, side, startTime);
            return;
        }
        const deltaSeconds = (deltaPx / width) * total;
        const clampedSeconds = Math.max(-region.start, Math.min(total - region.end, deltaSeconds));
        original((clampedSeconds / total) * width, side, startTime);
    };
    /* eslint-enable no-underscore-dangle */
}

/**
 * Persists user-created and user-edited waveform regions as audio intervals.
 */
export function useRegionEditing({
    regionRuntime, viewport, isPreviewRegion, ready,
}: Params): void {
    const dispatch = useDispatch<ThunkDispatch>();
    const { intervals, activeLabelId, activeControl } = useSelector(
        (state: CombinedState) => ({
            intervals: state.audio.player.intervals,
            activeLabelId: state.audio.player.activeLabelId,
            activeControl: state.annotation.canvas.activeControl,
        }),
        shallowEqual,
    );
    const latestRef = useRef({ intervals, activeLabelId });
    latestRef.current = { intervals, activeLabelId };

    // setup when runtime is ready
    useEffect(() => {
        if (!ready) return undefined;

        const { regionsPlugin } = regionRuntime;

        // convert newly created regions in wavesurfer into redux intervals
        const onRegionCreated = (region: Region): void => {
            if (isPreviewRegion(region)) return;
            installRegionDragBoundsConstraint(region);
            const clientID = clientIDFromWaveRegionId(region.id);
            const exists =
                clientID !== null && latestRef.current.intervals.some((interval) => interval.clientID === clientID);
            if (exists) return;

            const start = Math.max(0, region.start);
            const end = Math.max(start, region.end);
            // remove the source region to get it re-created from redux
            region.remove();
            if (end - start > MIN_INTERVAL_DURATION) {
                dispatch(createAudioIntervalAsync(start, end, latestRef.current.activeLabelId));
            }
        };

        // convert adjustments of regions in wavesurfer into adjustments of redux intervals
        const onRegionUpdated = (region: Region): void => {
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;
            const interval = latestRef.current.intervals.find((item) => item.clientID === clientID);
            if (!interval) return;
            if (
                Math.abs(intervalStartSeconds(interval) - region.start) < INTERVAL_BOUNDARY_EPSILON &&
                Math.abs(intervalEndSeconds(interval) - region.end) < INTERVAL_BOUNDARY_EPSILON
            ) {
                return;
            }

            dispatch(
                updateAudioIntervalAsync(clientID, {
                    start: Math.round(region.start * 1000),
                    stop: Math.round(region.end * 1000),
                }),
            );
        };

        regionsPlugin.getRegions().forEach((region) => {
            if (clientIDFromWaveRegionId(region.id) !== null) {
                installRegionDragBoundsConstraint(region);
            }
        });

        regionsPlugin.on('region-created', onRegionCreated);
        regionsPlugin.on('region-updated', onRegionUpdated);
        return () => {
            regionsPlugin.un('region-created', onRegionCreated);
            regionsPlugin.un('region-updated', onRegionUpdated);
        };
    }, [ready]);

    const isCreating = activeControl === ActiveControl.AUDIO_REGION_CREATE;
    useEffect(() => {
        if (!ready || !isCreating) return undefined;
        return regionRuntime.regionsPlugin.enableDragSelection({});
    }, [isCreating, ready]);

    useEffect(() => {
        if (!ready) return undefined;
        return attachRegionAutoScroll(regionRuntime.regionsPlugin, viewport.ensureTimeVisible);
    }, [ready]);
}
