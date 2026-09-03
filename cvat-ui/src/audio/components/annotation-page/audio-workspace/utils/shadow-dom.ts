// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

function updateParts(element: Element, update: (parts: Set<string>) => void): void {
    const parts = new Set(element.getAttribute('part')?.split(' ').filter(Boolean));
    update(parts);
    element.setAttribute('part', [...parts].join(' '));
}

/** Exposes an additional named styling surface from a shadow root. */
export function addPart(element: Element, part: string): void {
    updateParts(element, (parts) => parts.add(part));
}

/** Removes a previously exposed named styling surface from a shadow root. */
export function removePart(element: Element, part: string): void {
    updateParts(element, (parts) => parts.delete(part));
}
