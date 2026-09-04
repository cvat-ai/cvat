// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useLayoutEffect, useState } from 'react';
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
import { addPart, removePart } from '../utils/shadow-dom';
import { WaveformRegionRuntime } from './use-audio-waveform';

const HIDDEN_REGION_RESIZE_HANDLES_PART = 'cvat-audio-region-resize-handles-hidden';

interface Params {
    regionRuntime: WaveformRegionRuntime;
    ready: boolean;
}

export interface RegionHighlighting {
    highlightedRegionIDs: ReadonlySet<number>;
    addHighlightedRegionIDs(regionIDs: Iterable<number>): void;
    removeHighlightedRegionIDs(regionIDs: Iterable<number>): void;
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
export function useRegionProjection({ regionRuntime, ready }: Params): RegionHighlighting {
    const [highlightedRegionIDs, setHighlightedRegionIDs] = useState<Set<number>>(() => new Set());
    const regionHighlighting: RegionHighlighting = {
        highlightedRegionIDs,
        addHighlightedRegionIDs: (regionIDs: Iterable<number>): void => {
            setHighlightedRegionIDs((oldHighlighted) => {
                const nextHighlighted = new Set(oldHighlighted);
                for (const regionID of regionIDs) nextHighlighted.add(regionID);
                return nextHighlighted.size === oldHighlighted.size ? oldHighlighted : nextHighlighted;
            });
        },
        removeHighlightedRegionIDs: (regionIDs: Iterable<number>): void => {
            setHighlightedRegionIDs((oldHighlighted) => {
                const nextHighlighted = new Set(oldHighlighted);
                for (const regionID of regionIDs) nextHighlighted.delete(regionID);
                return nextHighlighted.size === oldHighlighted.size ? oldHighlighted : nextHighlighted;
            });
        },
    };
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
        opacity: state.settings.intervals.opacity,
        selectedOpacity: state.settings.shapes.selectedOpacity,
        activeControl: state.annotation.canvas.activeControl,
    }), shallowEqual);
    // This effect subscribes only to geometry and visibility.
    // It is important that other model changes do not trigger
    // geometry updates.
    useLayoutEffect(() => {
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
    useLayoutEffect(() => {
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
            const isHighlighted = isActive || isInteracting || isHovered || highlightedRegionIDs.has(clientID);
            const canDrag = activeControl === ActiveControl.CURSOR && !interval.lock && !interval.pinned;
            const canResize = activeControl === ActiveControl.CURSOR && !interval.lock;
            region.setOptions({
                color: getAudioRegionColor(interval, labels, colorBy, opacity, selectedOpacity, isActive),
                drag: canDrag,
                // Keep handles mounted for every editable region so their pointer targets
                // take precedence over dragging as soon as the pointer reaches a boundary.
                resize: canResize,
            });

            const { element } = region;
            if (!element) return;

            // Hidden handles remain interactive, giving unselected intervals an immediate
            // resize cursor at their boundaries without showing the handles until hover.
            element.querySelectorAll<HTMLElement>('[part*="region-handle"]').forEach((handle) => {
                if (isHighlighted) {
                    removePart(handle, HIDDEN_REGION_RESIZE_HANDLES_PART);
                } else {
                    addPart(handle, HIDDEN_REGION_RESIZE_HANDLES_PART);
                }
            });

            const selectionDisabled = activeControl === ActiveControl.AUDIO_REGION_CREATE ||
                activeControl === ActiveControl.AUDIO_REGION_RECORD;
            element.style.pointerEvents = selectionDisabled ? 'none' : 'all';
            // Regions are appended in their creation order, so a newer overlapping region would otherwise
            // intercept events intended for the semantically selected one. Keep the semantic target above
            // the rest; a hovered target must take precedence over an active target that is elsewhere.
            let zIndex = 0;
            if (isActive) {
                zIndex = 1;
            } else if (isHovered) {
                zIndex = 2;
            } else if (isInteracting) {
                zIndex = 3;
            }
            element.style.zIndex = String(zIndex);
            const borderColor = getRegionItemColor(interval, labels, colorBy);
            // A border changes the region's padding box. WaveSurfer anchors resize handles
            // to that box, which shifts their hit areas inward from the displayed boundaries.
            // An inset shadow provides the same visual selection outline without changing
            // the coordinate system used by the handles.
            element.style.boxShadow = isHighlighted ? `inset 0 0 0 2px ${borderColor}` : '';
        });
    }, [
        activeControl, activeIntervalID, colorBy, hoveredIntervalID, highlightedRegionIDs, interactingIntervalID,
        intervals, labels,
        opacity, ready, selectedOpacity,
    ]);

    return regionHighlighting;
}
