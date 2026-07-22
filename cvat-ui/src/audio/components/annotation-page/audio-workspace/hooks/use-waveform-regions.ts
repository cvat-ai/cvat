// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useCallback } from 'react';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';

import { AudioTimeRange, clampRange } from '../utils/audio-interval';
import { WaveformRegionRuntime } from './use-audio-waveform';
import { WaveformViewport } from './use-waveform-viewport';
import { useRegionEditing } from './use-region-editing';
import { useRegionSelection } from './use-region-selection';
import { useRegionProjection } from './use-region-projection';

const PREVIEW_REGION_PREFIX = 'audio-preview-';

export interface RegionPreviewOptions {
    range: AudioTimeRange;
    color: string;
}

export interface RegionPreviewHandle {
    /**
     * Updates the range of the preview region. If the preview region has been removed, this method does nothing.
     */
    updateRange(range: AudioTimeRange): void;
    /**
     * Removes the preview region from the waveform.
     */
    remove(): void;
}

export interface WaveformRegions {
    /**
     * Creates a preview region on the waveform. A preview region is a temporary not interactive region.
     */
    createPreview(options: RegionPreviewOptions): RegionPreviewHandle | null;
}

interface Params {
    regionRuntime: WaveformRegionRuntime;
    viewport: WaveformViewport;
    ready: boolean;
    readyRef: React.MutableRefObject<boolean>;
    durationRef: React.MutableRefObject<number>;
}

interface PreviewCapability extends WaveformRegions {
    isPreviewRegion(region: Region): boolean;
}

function isPreviewRegion(region: Region): boolean {
    return region.id.startsWith(PREVIEW_REGION_PREFIX);
}

function generatePreviewRegionId(): string {
    return `${PREVIEW_REGION_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function useRegionPreviewCapability(
    regionRuntime: WaveformRegionRuntime,
    readyRef: React.MutableRefObject<boolean>,
    durationRef: React.MutableRefObject<number>,
): PreviewCapability {
    const createPreview = useCallback((options: RegionPreviewOptions): RegionPreviewHandle | null => {
        if (!readyRef.current || durationRef.current <= 0) return null;
        const { regionsPlugin } = regionRuntime;
        const range = clampRange(options.range, durationRef.current);
        const region = regionsPlugin.addRegion({
            id: generatePreviewRegionId(),
            start: range.start,
            end: range.end,
            color: options.color,
            drag: false,
            resize: false,
        });
        if (region.element) region.element.style.pointerEvents = 'none';

        let removed = false;
        const remove = (): void => {
            if (removed) return;
            removed = true;
            if (regionsPlugin.getRegions().includes(region)) region.remove();
        };
        return {
            updateRange: (nextRange: AudioTimeRange): void => {
                if (removed || !regionsPlugin.getRegions().includes(region)) return;
                region.setOptions(clampRange(nextRange, durationRef.current));
            },
            remove,
        };
    }, []);

    return { createPreview, isPreviewRegion };
}

export function useWaveformRegions({
    regionRuntime, viewport, ready, readyRef, durationRef,
}: Params): WaveformRegions {
    const previewCapability = useRegionPreviewCapability(regionRuntime, readyRef, durationRef);

    useRegionEditing({
        regionRuntime,
        viewport,
        isPreviewRegion: previewCapability.isPreviewRegion,
        ready,
    });
    useRegionSelection({ regionRuntime, viewport, ready });
    useRegionProjection({ regionRuntime, ready });

    return {
        createPreview: previewCapability.createPreview,
    };
}
