// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { KeyMap } from 'utils/mousetrap-react';

type MultiSelectModifier = 'shift' | 'ctrl' | 'alt' | 'meta';
type ModifierEvent = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>;

export function multiSelectModifierFromKeyMap(keyMap: KeyMap): MultiSelectModifier {
    const [sequence] = keyMap.CANVAS_MULTI_SELECT_MODIFIER?.sequences ?? [];
    if (sequence === 'ctrl' || sequence === 'control') return 'ctrl';
    if (sequence === 'alt' || sequence === 'option') return 'alt';
    if (sequence === 'meta' || sequence === 'command' || sequence === 'cmd') return 'meta';
    return 'shift';
}

export function isMultiSelectModifierPressed(event: ModifierEvent, keyMap: KeyMap): boolean {
    const modifier = multiSelectModifierFromKeyMap(keyMap);
    const modifiers = {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
    };

    return modifiers[modifier] && Object.entries(modifiers)
        .every(([key, pressed]) => key === modifier || !pressed);
}
