// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useLayoutEffect, useRef } from 'react';
import TimelinePlugin, { type TimelinePluginOptions } from 'wavesurfer.js/dist/plugins/timeline';

import { formatSecondsWithPrecision } from 'audio/utils/format-audio-time';

import type { WaveSurferRuntime } from './use-audio-waveform';

interface TimelineDensityBand {
    minPixelsPerSecond: number;
    options: TimelinePluginOptions;
}

// Must be ordered by minPixelsPerSecond DESC
// Using spacing over interval settings as the latter may introduce uneven labels
// Need to explicitly clear interval options as there are defaults that are
// getting merged with custom spacing settings otherwise
const DENSITY_BANDS: TimelineDensityBand[] = [
    {
        minPixelsPerSecond: 1500,
        options: {
            timeInterval: 0.03125,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 8,
            secondaryLabelSpacing: 4,
            formatTimeCallback: (seconds: number): string => formatSecondsWithPrecision(seconds, 3),
        },
    },
    {
        minPixelsPerSecond: 350,
        options: {
            timeInterval: 0.125,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 8,
            secondaryLabelSpacing: 4,
            formatTimeCallback: (seconds: number): string => formatSecondsWithPrecision(seconds, 2),
        },
    },
    {
        minPixelsPerSecond: 70,
        options: {
            timeInterval: 0.5,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 10,
            secondaryLabelSpacing: 5,
            formatTimeCallback: (seconds: number): string => formatSecondsWithPrecision(seconds, 1),
        },
    },
    {
        minPixelsPerSecond: 35,
        options: {
            timeInterval: 1,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 10,
            secondaryLabelSpacing: 5,
        },
    },
    {
        minPixelsPerSecond: 7,
        options: {
            timeInterval: 5,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 6,
            secondaryLabelSpacing: 3,
        },
    },
    {
        minPixelsPerSecond: 3.5,
        options: {
            timeInterval: 10,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 6,
            secondaryLabelSpacing: 3,
        },
    },
    {
        minPixelsPerSecond: 1.2,
        options: {
            timeInterval: 30,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 10,
            secondaryLabelSpacing: 5,
        },
    },
    {
        minPixelsPerSecond: 0,
        options: {
            timeInterval: 60,
            primaryLabelInterval: 0,
            secondaryLabelInterval: 0,
            primaryLabelSpacing: 10,
            secondaryLabelSpacing: 5,
        },
    },
];

function getTimelineDensityBand(pixelsPerSecond: number): TimelineDensityBand {
    const band = DENSITY_BANDS.find(({ minPixelsPerSecond }) => pixelsPerSecond >= minPixelsPerSecond);
    return band || DENSITY_BANDS[DENSITY_BANDS.length - 1];
}

/**
 * TimelinePlugin has no public API for updating interval options. Replace it
 * only when zoom moves to a different prepared density band.
 */
export function useAdaptiveTimeline(runtime: WaveSurferRuntime, pixelsPerSecond: number): void {
    const previousBandRef = useRef<TimelineDensityBand | null>(null);

    useLayoutEffect(() => {
        const { instanceRef, timelineRef } = runtime;
        const instance = instanceRef.current;
        const timeline = timelineRef.current;
        if (!runtime.ready || !instance || !timeline) {
            return;
        }

        const band = getTimelineDensityBand(pixelsPerSecond);
        if (previousBandRef.current === band) return;

        timeline.destroy();
        const nextTimeline = TimelinePlugin.create(band.options);
        timelineRef.current = nextTimeline;
        previousBandRef.current = band;
        instance.registerPlugin(nextTimeline);
    }, [pixelsPerSecond, runtime.instanceRef, runtime.ready, runtime.timelineRef]);
}
