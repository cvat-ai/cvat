// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { ShortcutsActions, ShortcutsActionsTypes } from 'actions/shortcuts-actions';
import { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { ShortcutsState } from '.';

const capitalize = (text: string): string => text.slice(0, 1).toUpperCase() + text.slice(1);
const prettify = (key: string): string => {
    switch (key.toLowerCase()) {
        case 'arrowup':
            return 'Arrow Up';
        case 'arrowdown':
            return 'Arrow Down';
        case 'arrowleft':
            return 'Arrow Left';
        case 'arrowright':
            return 'Arrow Right';
        default:
            return capitalize(key);
    }
};

function formatShortcuts(shortcuts: KeyMapItem): string {
    const list: string[] = shortcuts.displayedSequences || (shortcuts.sequences as string[]);
    return `[${list
        .map((shortcut: string): string => {
            let keys = shortcut.toLowerCase().split('+');
            keys = keys.map((key: string): string => prettify(key));
            keys = keys.join('+').split(/\s/g);
            keys = keys.map((key: string): string => prettify(key));
            return keys.join(' ');
        })
        .join(', ')}]`;
}

const defaultKeyMap = {} as any as KeyMap;

const defaultState: ShortcutsState = {
    visibleShortcutsHelp: false,
    keyMap: defaultKeyMap,
    normalizedKeyMap: Object.keys(defaultKeyMap).reduce((acc: Record<string, string>, key: string) => {
        const normalized = formatShortcuts(defaultKeyMap[key]);
        acc[key] = normalized;
        return acc;
    }, {}),
};

function conflictDetector(shortcuts: Record<string, KeyMapItem>, keyMap: KeyMap): KeyMapItem | null {
    const flatKeyMap: { [scope: string]: { sequences: string[], items: Record<string, KeyMapItem> } } = {};

    for (const [action, keyMapItem] of Object.entries(keyMap)) {
        const scope = keyMapItem.scope || ShortcutScope.ALL;
        if (!flatKeyMap[scope]) {
            flatKeyMap[scope] = { sequences: [], items: {} };
        }
        flatKeyMap[scope].sequences.push(...keyMapItem.sequences);
        flatKeyMap[scope].items[action] = keyMapItem;
    }

    for (const [action, keyMapItem] of Object.entries(shortcuts)) {
        const scope = keyMapItem.scope || ShortcutScope.ALL;
        const { sequences } = keyMapItem;

        if (!flatKeyMap[scope]) {
            flatKeyMap[scope] = { sequences: [], items: {} };
        }

        for (const sequence of sequences) {
            if (flatKeyMap[scope].sequences.includes(sequence)) {
                const conflictingAction = Object.keys(flatKeyMap[scope].items)
                    .find((a) => flatKeyMap[scope].items[a].sequences.includes(sequence));
                const conflictingItem = flatKeyMap[scope].items[conflictingAction!];
                console.error(`Conflict detected for scope '${scope}' with sequence '${sequence}'`);
                console.error('  - Current KeyMapItem:');
                console.error(keyMapItem);
                console.error('  - Conflicting KeyMapItem:');
                console.error(conflictingItem);
                return conflictingItem;
            }
        }

        flatKeyMap[scope].sequences.push(...sequences);
        flatKeyMap[scope].items[action] = keyMapItem;
    }

    return null;
}
export default (state = defaultState, action: ShortcutsActions | BoundariesActions | AuthActions): ShortcutsState => {
    switch (action.type) {
        case ShortcutsActionsTypes.REGISTER_SHORTCUTS: {
            const { shortcuts } = action.payload;
            const keys = Object.keys(shortcuts);
            if (!keys.length) {
                return state;
            }
            const conflictingShortcut = conflictDetector(shortcuts, state.keyMap);
            if (conflictingShortcut) {
                throw new Error(`The shortcut has conflicts with this shortcut: ${conflictingShortcut}.`);
            }
            return {
                ...state,
                keyMap: { ...state.keyMap, ...shortcuts },
                normalizedKeyMap: keys.reduce((acc: Record<string, string>, key: string) => {
                    const normalized = formatShortcuts(shortcuts[key]);
                    acc[key] = normalized;
                    return acc;
                }, { ...state.normalizedKeyMap }),
            };
        }

        case ShortcutsActionsTypes.SWITCH_SHORTCUT_DIALOG: {
            return {
                ...state,
                visibleShortcutsHelp: action.payload.visible,
            };
        }
        case ShortcutsActionsTypes.UPDATE_SEQUNCE: {
            const { keyMapId, updatedSequence } = action.payload;
            const keyMap = { ...state.keyMap };
            keyMap[keyMapId] = { ...keyMap[keyMapId], sequences: updatedSequence };
            const normalized = formatShortcuts(keyMap[keyMapId]);
            return {
                ...state,
                keyMap,
                normalizedKeyMap: { ...state.normalizedKeyMap, [keyMapId]: normalized },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default: {
            return state;
        }
    }
};
