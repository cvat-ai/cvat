// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function formatTimeShort(seconds: number): string {
    const safe = Math.max(0, Math.round(seconds * 1000));
    const totalMins = Math.floor(safe / 60000);
    const secs = Math.floor((safe % 60000) / 1000);
    const milliseconds = safe % 1000;
    return `${totalMins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

export function formatMilliseconds(value: number): string {
    const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const milliseconds = safe % 1000;

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

export function formatSecondsWithPrecision(value: number, precision: number): string {
    const safePrecision = Math.max(0, Math.floor(precision));
    const multiplier = 10 ** safePrecision;
    const safe = Number.isFinite(value) ? Math.max(0, Math.round(value * multiplier)) : 0;
    const minutes = Math.floor(safe / (60 * multiplier));
    const seconds = Math.floor(safe / multiplier) % 60;
    const fractional = safe % multiplier;
    const suffix = safePrecision ? `.${fractional.toString().padStart(safePrecision, '0')}` : '';

    return `${minutes}:${seconds.toString().padStart(2, '0')}${suffix}`;
}

export function formatSeconds(value: number): string {
    return formatSecondsWithPrecision(value, 3);
}
