// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ColorBy } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import { hexToRgba } from 'audio/utils/hex-color';
import type { ClosedAudioInterval } from 'audio/utils/audio-interval';

const DEFAULT_COLOR = '#6366F1';
const AUDIO_MIN_OPACITY = 20;

function resolveAudioHex(
    interval: ClosedAudioInterval,
    labels: Label[],
    colorBy: ColorBy,
): string {
    if (colorBy === ColorBy.INSTANCE) {
        return interval.color || DEFAULT_COLOR;
    }
    const label = labels.find((l) => l.id === interval.label.id);
    return (label?.color as string) || DEFAULT_COLOR;
}

export function getAudioRegionColor(
    interval: ClosedAudioInterval,
    labels: Label[],
    colorBy: ColorBy,
    opacity: number,
    selectedOpacity: number,
    isActive: boolean,
): string {
    const hex = resolveAudioHex(interval, labels, colorBy);
    const alpha = Math.max(isActive ? selectedOpacity : opacity, AUDIO_MIN_OPACITY);
    return hexToRgba(hex, alpha);
}

export function getRegionItemColor(
    interval: ClosedAudioInterval,
    labels: Label[],
    colorBy: ColorBy,
): string {
    return resolveAudioHex(interval, labels, colorBy);
}
