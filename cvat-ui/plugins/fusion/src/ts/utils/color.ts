// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { LINK_ID_ATTR_NAME } from '../consts';

/**
 * djb2 hash — turns a string into a deterministic 32-bit number.
 */
export function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        // hash * 33 + charCode
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash |= 0; // keep 32-bit
    }
    return Math.abs(hash);
}

/**
 * Convert a link_id string to a deterministic HSL colour.
 * null / empty → grey placeholder for "unlinked".
 */
export function linkIdToColor(linkId: string | null): string {
    if (!linkId) return '#888888';
    const h = hashString(linkId) % 360;
    return `hsl(${h}, 70%, 55%)`;
}

/**
 * Given an ObjectState, find the attribute named `link_id` and return its
 * current value (or null when not found / empty).
 */
export function getLinkIdFromState(state: any): string | null {
    if (!state?.label?.attributes) return null;

    const spec = state.label.attributes.find(
        (attr: any) => attr.name === LINK_ID_ATTR_NAME,
    );
    if (!spec) return null;

    const value = state.attributes?.[spec.id];
    if (value === undefined || value === null || value === '') return null;
    return String(value);
}
