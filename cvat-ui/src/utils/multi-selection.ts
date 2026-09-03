// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { KeyMap } from 'utils/mousetrap-react';
import {
    Attribute, ObjectState, ObjectType, ShapeType,
} from 'cvat-core-wrapper';

type MultiSelectModifier = 'shift' | 'ctrl' | 'alt' | 'meta';
type ModifierEvent = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>;
export type SelectionToggleProperty = 'lock' | 'pinned';

interface SelectionToggleState {
    active: boolean;
    disabledReason: string | null;
}

interface SelectionGroupState {
    canGroup: boolean;
    canUngroup: boolean;
    alreadyInSameGroup: boolean;
}

interface SelectionAttributeState {
    enabled: boolean;
    disabledReason: string | null;
    attributes: Attribute[];
}

const LOCK_DISABLED_REASON = 'Ground truth objects cannot be locked or unlocked';
const PIN_DISABLED_REASON = 'Locked, ground truth, tag, and skeleton element objects cannot be pinned';

export function getSelectedStates(states: ObjectState[], selectedStatesID: number[]): ObjectState[] {
    const selectedIDs = new Set(selectedStatesID);
    return states.filter((state: ObjectState): boolean => selectedIDs.has(state.clientID as number));
}

export function getSelectionToggleState(
    states: ObjectState[],
    property: SelectionToggleProperty,
): SelectionToggleState {
    const active = states.length > 0 && states.every((state: ObjectState): boolean => state[property]);
    let disabledReason: string | null = null;
    if (property === 'lock' && states.some((state: ObjectState): boolean => state.isGroundTruth)) {
        disabledReason = LOCK_DISABLED_REASON;
    } else if (property === 'pinned' && states.some((state: ObjectState): boolean => (
        state.lock || state.isGroundTruth ||
        state.objectType === ObjectType.TAG ||
        (state.shapeType === ShapeType.POINTS && Number.isInteger(state.parentID))
    ))) {
        disabledReason = PIN_DISABLED_REASON;
    }

    return {
        active,
        disabledReason,
    };
}

export function prepareSelectionToggle(
    states: ObjectState[],
    property: SelectionToggleProperty,
): ObjectState[] {
    const { active, disabledReason } = getSelectionToggleState(states, property);
    if (disabledReason) return [];

    const statesToUpdate = states.filter((state: ObjectState): boolean => state[property] === active);
    for (const state of statesToUpdate) state[property] = !active;
    return statesToUpdate;
}

export function prepareSelectionZOrder(
    states: ObjectState[],
    resolveZOrder: (state: ObjectState) => number,
): ObjectState[] {
    const statesToUpdate: ObjectState[] = [];
    for (const state of states) {
        if (state.lock || state.isGroundTruth || ![ObjectType.SHAPE, ObjectType.TRACK].includes(state.objectType)) {
            continue;
        }

        const zOrder = resolveZOrder(state);
        if (zOrder !== state.zOrder) {
            state.zOrder = zOrder;
            statesToUpdate.push(state);
        }
    }
    return statesToUpdate;
}

export function getSelectionGroupState(states: ObjectState[]): SelectionGroupState {
    const groupID = states[0]?.group?.id || 0;
    const alreadyInSameGroup = states.length > 1 && !!groupID &&
        states.every((state: ObjectState): boolean => state.group?.id === groupID);

    return {
        canGroup: states.length > 1 && !alreadyInSameGroup,
        canUngroup: states.some((state: ObjectState): boolean => !!state.group?.id),
        alreadyInSameGroup,
    };
}

export function getSelectionAttributeState(states: ObjectState[]): SelectionAttributeState {
    const sameLabel = states.length > 0 && states.every(
        (state: ObjectState): boolean => state.label.id === states[0].label.id,
    );
    const attributes = sameLabel ? [...states[0].label.attributes] : [];
    let disabledReason: string | null = null;
    if (!states.length) {
        disabledReason = 'Select at least one object';
    } else if (states.some((state: ObjectState): boolean => state.lock)) {
        disabledReason = 'Attributes cannot be changed for locked objects';
    } else if (states.some((state: ObjectState): boolean => state.isGroundTruth)) {
        disabledReason = 'Ground truth objects cannot be updated';
    } else if (!sameLabel) {
        disabledReason = 'Selected objects have different labels';
    } else if (!attributes.length) {
        disabledReason = 'The selected label has no attributes';
    }

    return {
        enabled: disabledReason === null,
        disabledReason,
        attributes,
    };
}

function modifierFromKeyMap(
    keyMap: KeyMap,
    shortcut: 'CANVAS_MULTI_SELECT_MODIFIER' | 'CANVAS_MULTI_SELECT_OBJECT_MODIFIER',
    fallback: MultiSelectModifier,
): MultiSelectModifier {
    const [sequence] = keyMap[shortcut]?.sequences ?? [];
    if (sequence === 'ctrl' || sequence === 'control') return 'ctrl';
    if (sequence === 'alt' || sequence === 'option') return 'alt';
    if (sequence === 'meta' || sequence === 'command' || sequence === 'cmd') return 'meta';
    if (sequence === 'shift') return 'shift';
    return fallback;
}

function isModifierPressed(event: ModifierEvent, modifier: MultiSelectModifier): boolean {
    const modifiers = {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
    };

    return modifiers[modifier] && Object.entries(modifiers)
        .every(([key, pressed]) => key === modifier || !pressed);
}

export function multiSelectModifierFromKeyMap(keyMap: KeyMap): MultiSelectModifier {
    return modifierFromKeyMap(keyMap, 'CANVAS_MULTI_SELECT_MODIFIER', 'shift');
}

export function multiSelectObjectModifierFromKeyMap(keyMap: KeyMap): MultiSelectModifier {
    return modifierFromKeyMap(keyMap, 'CANVAS_MULTI_SELECT_OBJECT_MODIFIER', 'ctrl');
}

export function isMultiSelectModifierPressed(event: ModifierEvent, keyMap: KeyMap): boolean {
    return isModifierPressed(event, multiSelectModifierFromKeyMap(keyMap));
}

export function isMultiSelectObjectModifierPressed(event: ModifierEvent, keyMap: KeyMap): boolean {
    return isModifierPressed(event, multiSelectObjectModifierFromKeyMap(keyMap));
}
