// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function computeTextColor(backgroundHex: string): string {
    let textColor = '#ffffff';
    try {
        // convert color to grayscale and from the result get better text color
        // (for darken background -> lighter text, etc.)
        const [r, g, b] = [backgroundHex.slice(1, 3), backgroundHex.slice(3, 5), backgroundHex.slice(5, 7)];
        const grayscale = (parseInt(r, 16) + parseInt(g, 16) + parseInt(b, 16)) / 3;
        if (grayscale - 128 >= 0) {
            textColor = '#000000';
        }
    } catch (_: any) {
        // nothing to do
    }

    return textColor;
}
