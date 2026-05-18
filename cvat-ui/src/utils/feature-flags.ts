// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

interface ServerWithFeatures {
    features?: {
        audio_annotations?: boolean;
    };
}

export function useAudioAnnotationsEnabled(): boolean {
    return useSelector((state: CombinedState) => {
        const server = state.about.server as ServerWithFeatures | null;
        const flag = server?.features?.audio_annotations;
        return flag !== false;
    });
}
