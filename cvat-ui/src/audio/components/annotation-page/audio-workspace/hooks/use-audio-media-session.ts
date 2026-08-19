// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from 'react';

import type { WaveSurferRuntime } from './use-audio-waveform';

// A 100 ms tone.
// A completely silent, four-byte WAV is considered paused
// even while the HTML media element is looping.
const AUDIO_FOCUS_PROBE_SOURCE = [
    'data:audio/wav;base64,',
    'UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAq9Ht/f3v1K+EWTIVBAIPKU54o8vp+/7z2raM',
    'YDkZBgELI0ZwnMTk+f/2372UaD8eCQEJHj9olL3f9v/55MSccEYjCwEGGTlgjLba8/776cujeE4pDwIEFTJZhK/U7/397dGrgFUv',
    'EwMDESxRfKfO6/z+8deyiF01FwUCDSZKdKDH5/r/9d26kGQ8HAcBCiFDbJjB4vf/9+LBmGxDIQoBBxw8ZJC63fX/+ufHoHRKJg0C',
    'BRc1XYiy1/H+/OvOp3xRLBEDAxMvVYCr0e39/e/Ur4RZMhUEAg8pTnijy+n7/vPatoxgORkGAQsjRnCcxOT5//bfvZRoPx4JAQke',
    'P2iUvd/2//nkxJxwRiMLAQYZOWCMttrz/vvpy6N4TikPAgQVMlmEr9Tv/f3t0auAVS8TAwMRLFF8p87r/P7x17KIXTUXBQINJkp0',
    'oMfn+v/13bqQZDwcBwEKIUNsmMHi9//34sGYbEMhCgEHHDxkkLrd9f/658egdEomDQIFFzVdiLLX8f78686nfFEsEQMDEy9VgKvR',
    '7f3979SvhFkyFQQCDylOeKPL6fv+89q2jGA5GQYBCyNGcJzE5Pn/9t+9lGg/HgkBCR4/aJS93/b/+eTEnHBGIwsBBhk5YIy22vP++',
    '+nLo3hOKQ8CBBUyWYSv1O/9/e3Rq4BVLxMDAxEsUXynzuv8/vHXsohdNRcFAg0mSnSgx+f6//XdupBkPBwHAQohQ2yYweL3//fiw',
    'ZhsQyEKAQccPGSQut31//rnx6B0SiYNAgUXNV2Istfx/vzrzqd8USwRAwMTL1WAq9Ht/f3v1K+EWTIVBAIPKU54o8vp+/7z2raMYDk',
    'ZBgELI0ZwnMTk+f/2372UaD8eCQEJHj9olL3f9v/55MSccEYjCwEGGTlgjLba8/776cujeE4pDwIEFTJZhK/U7/397dGrgFUvEwMD',
    'ESxRfKfO6/z+8deyiF01FwUCDSZKdKDH5/r/9d26kGQ8HAcBCiFDbJjB4vf/9+LBmGxDIQoBBxw8ZJC63fX/+ufHoHRKJg0CBRc1',
    'XYiy1/H+/OvOp3xRLBEDAxMvVQ==',
].join('');

/**
 * Enables the Media Session API for the audio player.
 * This allows the user to control playback using system-level media controls.
 */
export function useAudioMediaSession({ instanceRef, ready }: WaveSurferRuntime): void {
    const audioFocusProbeRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // NOTE: audio focus is not requested by the browser when using WebAudio API
        // so we need to play a silent audio element in order to request it.
        // It's state and lifecycle is synced with the WaveSurfer instance.
        // The focus is only requested on the first play.
        const probe = new Audio(AUDIO_FOCUS_PROBE_SOURCE);
        probe.loop = true;
        probe.volume = 0;
        audioFocusProbeRef.current = probe;

        return () => {
            probe.pause();
            probe.removeAttribute('src');
            probe.load();
            audioFocusProbeRef.current = null;
        };
    }, []);

    useEffect(() => {
        const { mediaSession } = navigator;
        if (!mediaSession) return undefined;

        if ('MediaMetadata' in window) {
            mediaSession.metadata = new MediaMetadata({
                title: 'CVAT Audio Focus PoC',
                artist: 'CVAT',
            });
        }
        mediaSession.setActionHandler('play', () => {
            instanceRef.current?.play().catch(() => {});
        });
        mediaSession.setActionHandler('pause', () => {
            instanceRef.current?.pause();
        });

        return () => {
            mediaSession.setActionHandler('play', null);
            mediaSession.setActionHandler('pause', null);
            mediaSession.metadata = null;
        };
    }, []);

    useEffect(() => {
        const instance = instanceRef.current;
        if (!instance) return undefined;

        const duration = instance.getDuration();
        if (navigator.mediaSession && Number.isFinite(duration) && duration > 0) {
            try {
                navigator.mediaSession.setPositionState({ duration });
            } catch {
                // no op, some browsers don't support this API yet
            }
        }

        const onPlay = (): void => {
            audioFocusProbeRef.current?.play().catch(() => {});
            if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = 'playing';
            }
        };
        const onPause = (): void => {
            audioFocusProbeRef.current?.pause();
            if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = 'paused';
            }
        };

        instance.on('play', onPlay);
        instance.on('pause', onPause);
        return () => {
            instance.un('play', onPlay);
            instance.un('pause', onPause);
        };
    }, [ready]);
}
