// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { ActiveControl, CombinedState } from 'reducers';
import { shallowEqual } from 'utils/redux';
import { INTERVAL_BOUNDARY_EPSILON } from 'audio/utils/waveform-geometry';

import { getAudioRegionColor, getRegionItemColor } from '../audio-region-colors';
import {
    intervalToTimeRange, clientIDFromWaveRegionId, selectAudioIntervals, waveRegionId,
} from '../utils/audio-interval';
import { WaveformRegionRuntime } from './use-audio-waveform';

interface Params {
    regionRuntime: WaveformRegionRuntime;
    ready: boolean;
}

/**
 * Projects visible Redux intervals and their appearance into WaveSurfer regions.
 */
export function useRegionProjection({ regionRuntime, ready }: Params): void {
    const {
        intervals, activeIntervalID, hoveredIntervalID, labels,
        colorBy, opacity, selectedOpacity, activeControl,
    } = useSelector((state: CombinedState) => ({
        intervals: selectAudioIntervals(state),
        activeIntervalID: state.audio.player.activeIntervalID,
        hoveredIntervalID: state.audio.player.hoveredIntervalID,
        labels: state.annotation.job.labels,
        colorBy: state.settings.shapes.colorBy,
        opacity: state.settings.shapes.opacity,
        selectedOpacity: state.settings.shapes.selectedOpacity,
        activeControl: state.annotation.canvas.activeControl,
    }), shallowEqual);

    // synchronize waveform regions with redux state
    useEffect(() => {
        if (!ready) return;
        const { regionsPlugin } = regionRuntime;

        const visibleIntervals = intervals.filter((interval) => !interval.hidden);
        const intervalsByID = new Map(visibleIntervals.map((interval) => [interval.clientID, interval]));
        const regionsByID = new Map<number, Region>();

        const canEditInterval = (interval: (typeof intervals)[0]): boolean => (
            activeControl === ActiveControl.AUDIO_REGION_EDIT && !interval.lock
        );
        const isActiveInterval = (clientID: number): boolean => clientID === activeIntervalID;
        const getColor = (interval: (typeof intervals)[0], isActive: boolean): string => (
            getAudioRegionColor(interval, labels, colorBy, opacity, selectedOpacity, isActive)
        );
        const setRegionStyle = (region: Region, interval: (typeof intervals)[0], isActive: boolean): void => {
            const { element } = region;
            if (element) {
                const selectionDisabled = activeControl === ActiveControl.AUDIO_REGION_CREATE ||
                    activeControl === ActiveControl.AUDIO_REGION_RECORD;
                element.style.pointerEvents = selectionDisabled ? 'none' : 'all';
                const highlighted = isActive || interval.clientID === hoveredIntervalID;
                const borderColor = getRegionItemColor(interval, labels, colorBy);
                element.style.border = highlighted ? `2px solid ${borderColor}` : '';
            }
        };

        // reconcile existing regions with redux state
        regionsPlugin.getRegions().forEach((region) => {
            const clientID = clientIDFromWaveRegionId(region.id);
            if (clientID === null) return;

            const interval = intervalsByID.get(clientID);
            if (!interval) {
                region.remove();
                return;
            }

            regionsByID.set(clientID, region);
            const range = intervalToTimeRange(interval);
            const isActive = isActiveInterval(clientID);
            const canEdit = canEditInterval(interval);
            const options: Parameters<Region['setOptions']>[0] = {
                color: getColor(interval, isActive),
                drag: canEdit,
                resize: canEdit,
            };
            if (Math.abs(region.start - range.start) >= INTERVAL_BOUNDARY_EPSILON) options.start = range.start;
            if (Math.abs(region.end - range.end) >= INTERVAL_BOUNDARY_EPSILON) options.end = range.end;
            region.setOptions(options);
            setRegionStyle(region, interval, isActive);
        });

        // add new regions for intervals that don't have a corresponding region yet
        visibleIntervals.forEach((interval) => {
            const clientID = interval.clientID as number;
            if (regionsByID.has(clientID)) return;
            const canEdit = canEditInterval(interval);
            const isActive = isActiveInterval(clientID);
            const region = regionsPlugin.addRegion({
                id: waveRegionId(interval),
                ...intervalToTimeRange(interval),
                color: getColor(interval, isActive),
                drag: canEdit,
                resize: canEdit,
            });
            setRegionStyle(region, interval, isActive);
        });
    }, [
        activeControl, activeIntervalID, colorBy, hoveredIntervalID, intervals, labels,
        opacity, ready, selectedOpacity,
    ]);
}
