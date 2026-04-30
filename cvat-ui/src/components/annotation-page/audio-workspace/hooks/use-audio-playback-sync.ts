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
}

export function useAudioPlaybackSync({
    wavesurfer, isPlaying, currentTime, duration, zoom, volume, playbackRate,
}: Params): { lastWsTimeRef: React.MutableRefObject<number> } {
    const lastWsTimeRef = useRef(0);

    useEffect(() => {
        if (!wavesurfer) return;
        if (isPlaying && !wavesurfer.isPlaying()) {
            wavesurfer.play();
        } else if (!isPlaying && wavesurfer.isPlaying()) {
            wavesurfer.pause();
        }
    }, [isPlaying, wavesurfer]);

    useEffect(() => {
        if (!wavesurfer || !duration) return;
        if (Math.abs(currentTime - lastWsTimeRef.current) < 0.05) return;
        const clampedTime = Math.max(0, Math.min(duration, currentTime));
        wavesurfer.setTime(clampedTime);
    }, [currentTime, duration, wavesurfer]);

    const prevZoomRef = useRef(zoom);

    useEffect(() => {
        if (!wavesurfer) return;

        const prev = prevZoomRef.current;
        prevZoomRef.current = zoom;
        const isDrop = zoom < prev;

        const scrollContainer = wavesurfer.getWrapper()?.parentElement as HTMLElement | null;

        // On a zoom drop, hard-reset scrollLeft to 0 BEFORE wavesurfer.zoom()
        // so its internal lazy canvas renderer draws canvases for offset 0
        // (the visible area after the wrapper shrinks). Without this, it
        // draws for the old out-of-bounds scrollLeft → empty viewport.
        if (scrollContainer && isDrop) {
            scrollContainer.scrollLeft = 0;
        }

        wavesurfer.zoom(zoom);

        if (!scrollContainer || !isDrop) return;

        // Re-pin scrollLeft to 0 over the next two frames in case
        // wavesurfer's reRender / browser layout shifts it back.
        const pin = (): void => {
            if (scrollContainer.scrollLeft !== 0) {
                wavesurfer.setScroll(0);
            }
        };
        pin();
        const r1 = requestAnimationFrame(() => {
            pin();
            const r2 = requestAnimationFrame(pin);
            (r1 as unknown as { _r2?: number })._r2 = r2;
        });
        // eslint-disable-next-line consistent-return
        return () => {
            cancelAnimationFrame(r1);
            const r2 = (r1 as unknown as { _r2?: number })._r2;
            if (r2) cancelAnimationFrame(r2);
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
