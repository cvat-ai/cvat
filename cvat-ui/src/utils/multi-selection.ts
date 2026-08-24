// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { KeyMap } from 'utils/mousetrap-react';

type MultiSelectModifier = 'shift' | 'ctrl' | 'alt' | 'meta';
type ModifierEvent = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>;

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
