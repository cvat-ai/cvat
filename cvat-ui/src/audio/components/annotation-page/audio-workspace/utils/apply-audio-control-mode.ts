// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import type { Region } from 'wavesurfer.js/dist/plugins/regions';
import { AudioIntervalState } from 'cvat-core-wrapper';
import { ActiveControl } from 'reducers';
import { clientIDFromWaveRegionId } from './audio-interval';

export type DragSelectionCleanup = (() => void) | null;

export function applyAudioControlMode(
    control: ActiveControl,
    plugin: RegionsPlugin | null,
    dragSelectionCleanupRef: React.MutableRefObject<DragSelectionCleanup>,
    intervals: AudioIntervalState[],
): void {
    if (!plugin) return;

    const isCreate = control === ActiveControl.AUDIO_REGION_CREATE;
    const isEdit = control === ActiveControl.AUDIO_REGION_EDIT;
    const isRecord = control === ActiveControl.AUDIO_REGION_RECORD;

    const cleanupRef = dragSelectionCleanupRef;
    if (isCreate && !cleanupRef.current) {
        cleanupRef.current = plugin.enableDragSelection({});
    } else if (!isCreate && cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
    }

    plugin.getRegions().forEach((region: Region) => {
        const clientID = clientIDFromWaveRegionId(region.id);
        const interval = intervals.find((_interval) => _interval.clientID === clientID);
        const isLocked = interval?.lock;
        const canDrag = isEdit && !isLocked;
        region.setOptions({ drag: canDrag, resize: canDrag });
        const { element } = region;
        if (element) {
            element.style.pointerEvents = isCreate || isRecord ? 'none' : 'all';
        }
    });
}
