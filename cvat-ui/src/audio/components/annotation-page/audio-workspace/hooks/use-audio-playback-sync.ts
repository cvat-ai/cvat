// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';
import type WaveSurfer from 'wavesurfer.js';

interface Params {
    wavesurfer: WaveSurfer | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    zoom: number;
    volume: number;
    playbackRate: number;
    zoomAnchorRef: React.MutableRefObject<{
        time: number;
        x: number;
    } | null>;
}

export function useAudioPlaybackSync({
    wavesurfer, isPlaying, currentTime, duration, zoom, volume, playbackRate, zoomAnchorRef,
}: Params): { lastWsTimeRef: React.MutableRefObject<number> } {
    const lastWsTimeRef = useRef(0);

    useEffect(() => {
        if (!wavesurfer) return;
        if (isPlaying) {
            const result = wavesurfer.play();
            if (result && typeof (result as Promise<void>).catch === 'function') {
                (result as Promise<void>).catch(() => {});
            }
        } else {
            wavesurfer.pause();
        }
    }, [isPlaying, wavesurfer]);

    useEffect(() => {
        if (!wavesurfer || !duration) return;
        if (Math.abs(currentTime - lastWsTimeRef.current) < Number.EPSILON) return;
        const clampedTime = Math.max(0, Math.min(duration, currentTime));
        wavesurfer.setTime(clampedTime);
    }, [currentTime, duration, wavesurfer]);

    const prevZoomRef = useRef(zoom);
    const currentTimeRef = useRef(currentTime);
    const durationRef = useRef(duration);
    currentTimeRef.current = currentTime;
    durationRef.current = duration;

    useEffect(() => {
        if (!wavesurfer) return undefined;

        const prev = prevZoomRef.current;
        prevZoomRef.current = zoom;
        const isDrop = zoom < prev;

        const scrollContainer = wavesurfer.getWrapper()?.parentElement as HTMLElement | null;

        let targetScrollLeft = 0;
        const anchorRef = zoomAnchorRef;
        const zoomAnchor = anchorRef.current;
        anchorRef.current = null;

        if (scrollContainer && zoomAnchor) {
            const { clientWidth } = scrollContainer;
            const dur = durationRef.current;
            if (dur > 0) {
                const newTotalWidth = Math.max(clientWidth, dur * zoom);
                const newMaxScroll = Math.max(0, newTotalWidth - clientWidth);
                targetScrollLeft = Math.max(
                    0,
                    Math.min(newMaxScroll, zoomAnchor.time * zoom - zoomAnchor.x),
                );
            }
            scrollContainer.scrollLeft = targetScrollLeft;
        } else if (scrollContainer && isDrop) {
            const { clientWidth } = scrollContainer;
            const dur = durationRef.current;
            if (dur > 0) {
                const newTotalWidth = Math.max(clientWidth, dur * zoom);
                const newMaxScroll = Math.max(0, newTotalWidth - clientWidth);
                targetScrollLeft = Math.max(
                    0,
                    Math.min(newMaxScroll, currentTimeRef.current * zoom - clientWidth / 2),
                );
            }
            scrollContainer.scrollLeft = targetScrollLeft;
        }

        wavesurfer.zoom(zoom);

        if (!scrollContainer || (!isDrop && !zoomAnchor)) return undefined;

        const pin = (): void => {
            if (Math.abs(scrollContainer.scrollLeft - targetScrollLeft) > 1) {
                wavesurfer.setScroll(targetScrollLeft);
            }
        };
        pin();
        let r2: number | null = null;
        const r1 = requestAnimationFrame(() => {
            pin();
            r2 = requestAnimationFrame(pin);
        });
        return () => {
            cancelAnimationFrame(r1);
            if (r2 !== null) cancelAnimationFrame(r2);
        };
    }, [zoom, wavesurfer]);

    useEffect(() => {
        if (!wavesurfer) return;
        wavesurfer.setVolume(volume);
    }, [volume, wavesurfer]);

    useEffect(() => {
        if (!wavesurfer) return;
        wavesurfer.setPlaybackRate(playbackRate, true);
    }, [playbackRate, wavesurfer]);

    return { lastWsTimeRef };
}
