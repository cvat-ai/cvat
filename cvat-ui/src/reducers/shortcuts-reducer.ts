// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { ShortcutsActions, ShortcutsActionsTypes } from 'actions/shortcuts-actions';
import { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { isEqual } from 'lodash';
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
    defaultState: { ...defaultKeyMap },
};

function conflict(sequence: string, existingSequence: string): boolean {
    if (isEqual(sequence, existingSequence)) {
        return true;
    }
    const splitSequence = sequence.split(' ');
    const splitExistingSequence = existingSequence.split(' ');

    for (let i = 0; i < Math.max(splitSequence.length, splitExistingSequence.length); i++) {
        if (!splitSequence[i] || !splitExistingSequence[i]) {
            return true;
        }
        if (splitSequence[i] !== splitExistingSequence[i]) {
            return false;
        }
    }
    return true;
}

export function conflictDetector(
    shortcuts: Record<string, KeyMapItem>,
    keyMap: KeyMap): Record<string, KeyMapItem> | null {
    const flatKeyMap: { [scope: string]: { sequences: string[], items: Record<string, KeyMapItem> } } = {};
    const conflictingItems: Record<string, KeyMapItem> = {};

    for (const [action, keyMapItem] of Object.entries(keyMap)) {
        const { scope } = keyMapItem;
        if (!flatKeyMap[scope]) {
            flatKeyMap[scope] = { sequences: [], items: {} };
        }
        flatKeyMap[scope].sequences.push(...keyMapItem.sequences);
        flatKeyMap[scope].items[action] = keyMapItem;
    }

    for (const [action, keyMapItem] of Object.entries(shortcuts)) {
        const { scope } = keyMapItem;
        const { sequences } = keyMapItem;

        if (!flatKeyMap[scope]) {
            flatKeyMap[scope] = { sequences: [], items: {} };
        }

        const flatKeyMapUpdated = {
            sequences: [...flatKeyMap[scope].sequences],
            items: { ...flatKeyMap[scope].items },
        };

        if (scope && flatKeyMap[scope]) {
            if (scope === ShortcutScope.GLOBAL) {
                const otherScopes = Object.keys(flatKeyMap).filter((s) => s !== ShortcutScope.GLOBAL);
                for (const s of otherScopes) {
                    if (flatKeyMap[s]) {
                        flatKeyMapUpdated.sequences.push(...flatKeyMap[s].sequences);
                        flatKeyMapUpdated.items = { ...flatKeyMapUpdated.items, ...flatKeyMap[s].items };
                    }
                }
            } else {
                const globalSequences = flatKeyMap[ShortcutScope.GLOBAL]?.sequences || [];
                flatKeyMapUpdated.sequences.push(...globalSequences);
                flatKeyMapUpdated.items = {
                    ...flatKeyMapUpdated.items,
                    ...flatKeyMap[ShortcutScope.GLOBAL]?.items || {},
                };

                if (scope === ShortcutScope.ANNOTATION_PAGE) {
                    const otherAnnotationScopes = Object.keys(flatKeyMap).filter(
                        (s) => s.includes(ShortcutScope.ANNOTATION_PAGE) && s !== ShortcutScope.ANNOTATION_PAGE,
                    );
                    for (const s of otherAnnotationScopes) {
                        if (flatKeyMap[s]) {
                            flatKeyMapUpdated.sequences.push(...flatKeyMap[s].sequences);
                            flatKeyMapUpdated.items = { ...flatKeyMapUpdated.items, ...flatKeyMap[s].items };
                        }
                    }
                } else if (scope.includes(ShortcutScope.ANNOTATION_PAGE)) {
                    const annotationSequences = flatKeyMap[ShortcutScope.ANNOTATION_PAGE]?.sequences || [];
                    flatKeyMapUpdated.sequences.push(...annotationSequences);
                    flatKeyMapUpdated.items = {
                        ...flatKeyMapUpdated.items,
                        ...flatKeyMap[ShortcutScope.ANNOTATION_PAGE]?.items || {},
                    };
                }
            }
        }

        if (flatKeyMapUpdated.items[action]) {
            const currentSequences = flatKeyMapUpdated.items[action].sequences;
            delete flatKeyMapUpdated.items[action];
            flatKeyMapUpdated.sequences = flatKeyMapUpdated.sequences.filter(
                (s: any) => !currentSequences.includes(s),
            );
        }

        for (const sequence of sequences) {
            for (const existingSequence of flatKeyMapUpdated.sequences) {
                if (conflict(sequence, existingSequence)) {
                    const conflictingAction = Object.keys(flatKeyMapUpdated.items)
                        .find((a) => flatKeyMapUpdated.items[a].sequences.includes(existingSequence));
                    const conflictingItem = flatKeyMapUpdated.items[conflictingAction!];
                    if (conflictingAction) {
                        conflictingItems[conflictingAction] = conflictingItem;
                    }
                }
            }
        }

        flatKeyMap[scope].sequences.push(...sequences);
        flatKeyMap[scope].items[action] = keyMapItem;
    }

    return Object.keys(conflictingItems).length ? conflictingItems : null;
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
                throw new Error(`The shortcuts: ${JSON.stringify(shortcuts)}
                    have conflicts with these shortcut: ${JSON.stringify(conflictingShortcut)}.`);
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
            let keyMap = { ...state.keyMap };
            const shortcut = {
                [keyMapId]: { ...keyMap[keyMapId], sequences: updatedSequence },
            };
            const conflictingShortcuts = conflictDetector(shortcut, keyMap);
            if (conflictingShortcuts) {
                keyMap = { ...keyMap, ...conflictingShortcuts };
            }
            keyMap[keyMapId] = { ...keyMap[keyMapId], sequences: updatedSequence };
            const normalized = formatShortcuts(keyMap[keyMapId]);
            return {
                ...state,
                keyMap,
                normalizedKeyMap: { ...state.normalizedKeyMap, [keyMapId]: normalized },
            };
        }
        case ShortcutsActionsTypes.SET_SHORTCUTS: {
            const { shortcuts } = action.payload;
            return {
                ...state,
                ...shortcuts,
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
