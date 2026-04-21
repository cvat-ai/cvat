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

    useEffect(() => {
        if (!wavesurfer) return;
        wavesurfer.zoom(zoom);
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
