// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const FALLBACK_HEX = 'ffffff';

function normalizeHex(hex: string): string {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
        clean = clean.split('').map((ch) => ch + ch).join('');
    }
    if (!/^([0-9a-f]{6})$/i.test(clean)) {
        return FALLBACK_HEX;
    }
    return clean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = normalizeHex(hex);
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
    };
}

export function hexToRgba(hex: string, opacityPercent: number): string {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${opacityPercent / 100})`;
}

export function hexToRgbComponents(hex: string): string {
    const { r, g, b } = hexToRgb(hex);
    return `${r}, ${g}, ${b}`;
}
