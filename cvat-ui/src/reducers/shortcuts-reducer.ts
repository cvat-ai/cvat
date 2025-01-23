// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { ShortcutsActions, ShortcutsActionsTypes } from 'actions/shortcuts-actions';
import { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import { conflictDetector } from 'utils/conflict-detector';
import { ShortcutsState } from '.';

const capitalize = (text: string): string => text.slice(0, 1).toUpperCase() + text.slice(1);
const prettify = (key: string): string => {
    switch (key.toLowerCase()) {
        case 'up':
            return 'Arrow Up';
        case 'down':
            return 'Arrow Down';
        case 'left':
            return 'Arrow Left';
        case 'right':
            return 'Arrow Right';
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
    defaultState: { ...defaultKeyMap },
};

export default (state = defaultState, action: ShortcutsActions | BoundariesActions | AuthActions): ShortcutsState => {
    switch (action.type) {
        case ShortcutsActionsTypes.REGISTER_SHORTCUTS: {
            const { shortcuts } = action.payload;
            const keys = Object.keys(shortcuts);
            if (!keys.length) {
                return state;
            }
            conflictDetector(shortcuts, state.keyMap);
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
        case ShortcutsActionsTypes.UPDATE_SEQUENCE: {
            const { shortcutID, updatedSequence } = action.payload;
            let keyMap = { ...state.keyMap };
            const shortcut = {
                [shortcutID]: { ...keyMap[shortcutID], sequences: updatedSequence },
            };
            const conflictingShortcuts = conflictDetector(shortcut, keyMap);
            if (conflictingShortcuts) {
                keyMap = { ...keyMap, ...conflictingShortcuts };
            }
            keyMap[shortcutID] = { ...keyMap[shortcutID], sequences: updatedSequence };
            const normalized = formatShortcuts(keyMap[shortcutID]);
            return {
                ...state,
                keyMap,
                normalizedKeyMap: { ...state.normalizedKeyMap, [shortcutID]: normalized },
            };
        }
        case ShortcutsActionsTypes.SET_DEFAULT_SHORTCUTS: {
            const { shortcuts } = action.payload;
            return {
                ...state,
                defaultState: { ...shortcuts },
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
