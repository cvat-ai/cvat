// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ColorBy } from 'reducers';
import { AudioIntervalState, Label } from 'cvat-core-wrapper';
import { hexToRgba } from 'audio/utils/hex-color';

const DEFAULT_COLOR = '#6366F1';
export const AUDIO_MIN_OPACITY = 10;
const AUDIO_PREVIEW_MIN_OPACITY = 15;

function resolveLabelHex(labelID: number | null | undefined, labels: Label[]): string {
    const label = labels.find((item) => item.id === labelID);
    return (label?.color as string) || DEFAULT_COLOR;
}

function resolveAudioHex(
    interval: AudioIntervalState,
    labels: Label[],
    colorBy: ColorBy,
): string {
    if (colorBy === ColorBy.INSTANCE) {
        return interval.color || DEFAULT_COLOR;
    }
    return resolveLabelHex(interval.label.id, labels);
}

export function getAudioRegionColor(
    interval: AudioIntervalState,
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
    interval: AudioIntervalState,
    labels: Label[],
    colorBy: ColorBy,
): string {
    return resolveAudioHex(interval, labels, colorBy);
}

export function getAudioLabelPreviewColor(
    labelID: number | null | undefined,
    labels: Label[],
    opacity: number,
): string {
    return hexToRgba(resolveLabelHex(labelID, labels), Math.max(opacity, AUDIO_PREVIEW_MIN_OPACITY));
}
