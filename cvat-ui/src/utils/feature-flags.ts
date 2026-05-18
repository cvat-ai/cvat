// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

// Future server contract (when backend exposes feature flags via /api/server/about):
//     interface ServerFeatures { audio_annotations?: boolean; ... }
// Until then the selector accepts an undefined `features` field and defaults to enabled.
interface ServerWithFeatures {
    features?: {
        audio_annotations?: boolean;
    };
}

export function useAudioAnnotationsEnabled(): boolean {
    return useSelector((state: CombinedState) => {
        const server = state.about.server as ServerWithFeatures | null;
        const flag = server?.features?.audio_annotations;
        // Graceful default: when the server does not advertise the flag,
        // the audio feature stays enabled. When it explicitly returns false, audio is disabled.
        return flag !== false;
    });
}
