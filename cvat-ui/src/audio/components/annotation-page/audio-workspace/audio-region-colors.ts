// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ColorBy } from 'reducers';
import { AudioIntervalState, Label } from 'cvat-core-wrapper';
import { hexToRgba } from 'audio/utils/hex-color';

const DEFAULT_COLOR = '#6366F1';

function getAudioAlpha(percent: number): number {
    const opacity = percent / 100;
    return opacity + 0.2 * (1 - opacity) ** 2;
}

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
    return hexToRgba(hex, getAudioAlpha(isActive ? selectedOpacity : opacity));
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
    return hexToRgba(resolveLabelHex(labelID, labels), getAudioAlpha(opacity));
}
