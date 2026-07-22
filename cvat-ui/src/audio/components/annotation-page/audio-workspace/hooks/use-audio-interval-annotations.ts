// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AudioWaveform } from './use-audio-waveform';
import { IntervalNavigation, useIntervalNavigation } from './use-interval-navigation';
import { useAudioRecording } from './use-audio-recording';
import { useIntervalPlayback } from './use-interval-playback';
import { useWaveformRegions } from './use-waveform-regions';

export interface AudioIntervalAnnotations {
    navigation: IntervalNavigation;
}

interface Params {
    waveform: Omit<AudioWaveform, 'playerBindings'>;
}

export function useAudioIntervalAnnotations({ waveform }: Params): AudioIntervalAnnotations {
    const regions = useWaveformRegions({
        regionRuntime: waveform.regionRuntime,
        viewport: waveform.viewport,
        readyRef: waveform.readyRef,
        ready: waveform.ready,
        durationRef: waveform.durationRef,
    });
    useIntervalPlayback({
        regionRuntime: waveform.regionRuntime,
        playback: waveform.playback,
        ready: waveform.ready,
    });
    useAudioRecording({ playback: waveform.playback, regions, ready: waveform.ready });
    const navigation = useIntervalNavigation({ viewport: waveform.viewport });

    return { navigation };
}
