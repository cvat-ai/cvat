// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';
import { INTERVAL_BOUNDARY_EPSILON, MIN_INTERVAL_DURATION } from 'audio/utils/waveform-geometry';

import { getAudioRegionColor, getRegionItemColor } from '../audio-region-colors';
import {
    clientIDFromWaveRegionId, intervalEndSeconds, intervalStartSeconds,
} from '../utils/audio-interval';
import type { AudioTimeRange } from '../utils/audio-interval';
import { WaveformRegionRuntime } from './use-audio-waveform';

interface Params {
    regionRuntime: WaveformRegionRuntime;
    ready: boolean;
}

interface RegionGeometry extends AudioTimeRange {
    clientID: number;
    hidden: boolean;
}

function areRegionGeometriesEqual(previous: RegionGeometry[], next: RegionGeometry[]): boolean {
    return previous.length === next.length &&
        previous.every((geometry, index) => shallowEqual(geometry, next[index]));
}

/**
 * Projects visible Redux intervals and their appearance into WaveSurfer regions.
 */
export function useRegionProjection({ regionRuntime, ready }: Params): void {
    const regionGeometry = useSelector((state: CombinedState): RegionGeometry[] => (
        state.audio.player.intervals.map((interval) => ({
            clientID: interval.clientID as number,
            start: intervalStartSeconds(interval),
            end: intervalEndSeconds(interval),
            hidden: !!interval.hidden,
        }))
    ), areRegionGeometriesEqual);
    const {
        intervals, activeIntervalID, hoveredIntervalID, interactingIntervalID, labels,
        colorBy, opacity, selectedOpacity, activeControl,
    } = useSelector((state: CombinedState) => ({
        intervals: state.audio.player.intervals,
        activeIntervalID: state.audio.player.activeIntervalID,
        hoveredIntervalID: state.audio.player.hoveredIntervalID,
        interactingIntervalID: state.audio.player.interactingIntervalID,
        labels: state.annotation.job.labels,
        colorBy: state.settings.shapes.colorBy,
        opacity: state.settings.shapes.opacity,
        selectedOpacity: state.settings.shapes.selectedOpacity,
        activeControl: state.annotation.canvas.activeControl,
    }), shallowEqual);

    // This effect subscribes only to geometry and visibility.
    // It is important that other model changes do not trigger
    // geometry updates.
    useEffect(() => {
        if (!ready) return;
        const { regionsPlugin } = regionRuntime;

        const visibleGeometry = regionGeometry.filter((geometry) => !geometry.hidden);
        const geometryByID = new Map(visibleGeometry.map((geometry) => [geometry.clientID, geometry]));
        const regionsByID = new Map<number, Region>();

        regionsPlugin.getRegions().forEach((region) => {
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;

            const geometry = geometryByID.get(clientID);
            if (!geometry) {
                region.remove();
                return;
            }

            regionsByID.set(clientID, region);
            if (
                Math.abs(region.start - geometry.start) >= INTERVAL_BOUNDARY_EPSILON ||
                Math.abs(region.end - geometry.end) >= INTERVAL_BOUNDARY_EPSILON
            ) {
                region.setOptions({ start: geometry.start, end: geometry.end });
            }
        });

        // Add newly visible regions. Their initial geometry is set as part of creation.
        visibleGeometry.forEach((geometry) => {
            if (regionsByID.has(geometry.clientID)) return;
            regionsPlugin.addRegion({
                id: String(geometry.clientID),
                start: geometry.start,
                end: geometry.end,
                minLength: MIN_INTERVAL_DURATION,
                // Resize handles are kept as custom pointer targets, but
                // we implement our own resize logic.
                resizeStart: false,
                resizeEnd: false,
            });
        });
    }, [ready, regionGeometry]);

    // Keep non-geometric region state in a separate projection path
    useEffect(() => {
        if (!ready) return;
        const { regionsPlugin } = regionRuntime;
        const intervalsByID = new Map(intervals.map((interval) => [interval.clientID, interval]));

        regionsPlugin.getRegions().forEach((region) => {
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;

            const interval = intervalsByID.get(clientID);
            if (!interval || interval.hidden) return;

            const isActive = clientID === activeIntervalID;
            const isInteracting = clientID === interactingIntervalID;
            const isHovered = interactingIntervalID === null && clientID === hoveredIntervalID;
            const isHighlighted = isActive || isInteracting || isHovered;
            const canEdit = activeControl === ActiveControl.CURSOR && !interval.lock && !interval.pinned;
            region.setOptions({
                color: getAudioRegionColor(interval, labels, colorBy, opacity, selectedOpacity, isActive),
                drag: canEdit,
                resize: canEdit && isHighlighted,
            });

            const { element } = region;
            if (!element) return;

            const selectionDisabled = activeControl === ActiveControl.AUDIO_REGION_CREATE ||
                activeControl === ActiveControl.AUDIO_REGION_RECORD;
            element.style.pointerEvents = selectionDisabled ? 'none' : 'all';
            const borderColor = getRegionItemColor(interval, labels, colorBy);
            // A border changes the region's padding box. WaveSurfer anchors resize handles
            // to that box, which shifts their hit areas inward from the displayed boundaries.
            // An inset shadow provides the same visual selection outline without changing
            // the coordinate system used by the handles.
            element.style.boxShadow = isHighlighted ? `inset 0 0 0 2px ${borderColor}` : '';
        });
    }, [
        activeControl, activeIntervalID, colorBy, hoveredIntervalID, interactingIntervalID, intervals, labels,
        opacity, ready, selectedOpacity,
    ]);
}
