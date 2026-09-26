// SPDX-License-Identifier: MIT

import type { ObjectState } from 'cvat-core-wrapper';

// Validate the entire pose before changing any ObjectState. Match labels, never array positions.
export default function copySkeletonPose(previous: ObjectState, current: ObjectState): boolean {
    if (previous.objectType !== 'track' || current.objectType !== 'track' ||
        previous.shapeType !== 'skeleton' || current.shapeType !== 'skeleton' ||
        previous.clientID !== current.clientID || previous.label.id !== current.label.id ||
        previous.frame !== current.frame - 1) {
        throw new Error('Select the same skeleton track on consecutive frames.');
    }
    if (current.isGroundTruth || current.lock || current.elements.some((element) => element.lock)) {
        throw new Error('Unlock the skeleton and all its points before copying a pose.');
    }
    if (previous.outside || current.outside) {
        throw new Error('The skeleton must be present on both frames.');
    }
    const byLabel = new Map(previous.elements.map((element) => [element.label.id, element]));
    if (!current.elements.length || byLabel.size !== previous.elements.length ||
        byLabel.size !== current.elements.length ||
        new Set(current.elements.map((element) => element.label.id)).size !== byLabel.size) {
        throw new Error('The skeleton points do not match between frames.');
    }
    const updates = current.elements.map((element) => {
        const source = byLabel.get(element.label.id);
        if (!source || source.points.length !== 2 || !source.points.every(Number.isFinite)) {
            throw new Error(`Missing or invalid previous coordinates for ${element.label.name}.`);
        }
        return { element, points: [...source.points] };
    });
    if (updates.every(({ element, points }) => points.every((value, index) => value === element.points[index]))) {
        return false;
    }
    // Set every element, in the target's original order: SkeletonTrack.save groups them into one Undo.
    // Only coordinates change; visibility attributes, occluded/outside flags and boxes remain as reviewed.
    updates.forEach(({ element, points }) => { element.points = points; });
    return true;
}
