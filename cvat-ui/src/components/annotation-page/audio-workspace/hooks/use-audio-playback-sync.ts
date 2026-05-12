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
    // Snapshot latest currentTime/duration so the zoom effect can read them
    // without listing them as deps (which would re-fire on every playhead tick).
    const currentTimeRef = useRef(currentTime);
    const durationRef = useRef(duration);
    currentTimeRef.current = currentTime;
    durationRef.current = duration;

    useEffect(() => {
        if (!wavesurfer) return;

        const prev = prevZoomRef.current;
        prevZoomRef.current = zoom;
        const isDrop = zoom < prev;

        const scrollContainer = wavesurfer.getWrapper()?.parentElement as HTMLElement | null;

        // On a zoom drop the wrapper shrinks. Pre-set scrollLeft to a value
        // valid under the NEW zoom BEFORE wavesurfer.zoom() so its lazy canvas
        // renderer draws canvases for the visible viewport (otherwise it
        // draws for the old out-of-bounds offset → empty viewport). Center on
        // currentTime so the playhead stays in view instead of snapping to 0.
        let targetScrollLeft = 0;
        if (scrollContainer && isDrop) {
            const clientWidth = scrollContainer.clientWidth;
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

        if (!scrollContainer || !isDrop) return;

        // Re-pin scrollLeft over the next two frames in case wavesurfer's
        // reRender / browser layout shifts it.
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
        // eslint-disable-next-line consistent-return
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
