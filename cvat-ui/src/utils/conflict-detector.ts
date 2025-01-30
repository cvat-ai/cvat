// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { isEqual } from 'lodash';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { KeyMap, KeyMapItem } from './mousetrap-react';
import { ShortcutScope } from './enums';

interface FlatKeyMapItem {
    sequences: string[],
    items: Record<string, KeyMapItem>
}

interface FlatKeyMap {
    [scope:string]: FlatKeyMapItem
}

export function conflict(sequence: string, existingSequence: string): boolean {
    if (isEqual(sequence, existingSequence)) {
        return true;
    }
    if (!sequence.trim() || !existingSequence.trim()) {
        return false;
    }
    if (sequence === '+' || existingSequence === '+') {
        return false;
    }
    const splitSequence = sequence.split('+').join(' ').split(' ');
    const splitExistingSequence = existingSequence.split('+').join(' ').split(' ');

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

function initializeFlatKeyMap(keyMap: Record<string, KeyMapItem>): FlatKeyMap {
    const flatKeyMap: FlatKeyMap = {};
    for (const scope of Object.values(ShortcutScope)) {
        flatKeyMap[scope] = { sequences: [], items: {} };
    }
    for (const [action, keyMapItem] of Object.entries(keyMap)) {
        const { scope } = keyMapItem;
        flatKeyMap[scope].sequences.push(...keyMapItem.sequences);
        flatKeyMap[scope].items[action] = structuredClone(keyMapItem);
    }
    return flatKeyMap;
}

function updatedFlatKeyMap(scope: string, flatKeyMap: FlatKeyMap): FlatKeyMapItem {
    const flatKeyMapUpdated: FlatKeyMapItem = {
        sequences: [],
        items: {},
    };
    const scopes = [];
    if (scope === ShortcutScope.GENERAL) {
        scopes.push(...Object.keys(ShortcutScope));
    } else {
        scopes.push(ShortcutScope.GENERAL);
        if (scope === ShortcutScope.ANNOTATION_PAGE || scope === ShortcutScope.OBJECTS_SIDEBAR) {
            scopes.push(
                ShortcutScope.ANNOTATION_PAGE,
                ShortcutScope.OBJECTS_SIDEBAR,
                ...Object.keys(ShortcutScope).filter((s) => s.includes('WORKSPACE')),
            );
        } else if (scope.includes('WORKSPACE') && !scope.includes('CONTROLS')) {
            const sidebar = `${scope}_CONTROLS`;
            scopes.push(
                scope,
                sidebar,
                ShortcutScope.OBJECTS_SIDEBAR,
                ShortcutScope.ANNOTATION_PAGE,
            );
        } else if (scope.includes('WORKSPACE') && scope.includes('CONTROLS')) {
            const workspace = scope.split(' controls')[0];
            scopes.push(
                scope,
                workspace,
                ShortcutScope.ANNOTATION_PAGE,
                ShortcutScope.OBJECTS_SIDEBAR,
            );
        } else {
            scopes.push(scope);
        }
    }

    for (const s of scopes) {
        if (!flatKeyMap[s]) {
            continue;
        }
        flatKeyMapUpdated.sequences.push(...flatKeyMap[s].sequences);
        flatKeyMapUpdated.items = { ...flatKeyMapUpdated.items, ...flatKeyMap[s].items };
    }

    return flatKeyMapUpdated;
}

export function conflictDetector(
    shortcuts: Record<string, KeyMapItem>,
    keyMap: KeyMap): Record<string, KeyMapItem> | null {
    const flatKeyMap: FlatKeyMap = initializeFlatKeyMap(keyMap);
    const conflictingItems: Record<string, KeyMapItem> = {};

    for (const [label, keyMapItem] of Object.entries(shortcuts)) {
        const { scope } = keyMapItem;
        const { sequences } = keyMapItem;
        const flatKeyMapUpdated: FlatKeyMapItem = updatedFlatKeyMap(scope, flatKeyMap);
        let currentSequences: string[] = [];
        if (flatKeyMapUpdated.items[label]) {
            currentSequences = flatKeyMapUpdated.items[label].sequences;
        }

        for (const sequence of sequences.filter((seq) => !currentSequences.includes(seq))) {
            for (const existingSequence of flatKeyMapUpdated.sequences) {
                if (conflict(sequence, existingSequence)) {
                    const conflictingActions = Object.keys(flatKeyMapUpdated.items)
                        .filter((a) => flatKeyMapUpdated.items[a].sequences.includes(existingSequence));
                    console.warn(`The shortcut: ${sequence} of ${label} have conflicts with these shortcuts: ${conflictingActions.join(', ')}`);
                    conflictingActions.forEach((conflictingAction) => {
                        conflictingItems[conflictingAction] = flatKeyMapUpdated.items[conflictingAction];
                    });
                }
            }
        }

        flatKeyMap[scope].sequences.push(...sequences);
        flatKeyMap[scope].items[label] = keyMapItem;
    }

    return Object.keys(conflictingItems).length ? conflictingItems : null;
}

export function unsetExistingShortcuts(
    conflictingShortcuts: Record<string, KeyMapItem>,
    updatedSequence: string[],
    shortcut: Record<string, KeyMapItem>): void {
    const updatedShortcuts: Record<string, KeyMapItem> = {};
    for (const key of Object.keys(conflictingShortcuts)) {
        const conflictingItem: KeyMapItem = conflictingShortcuts[key];
        if (isEqual(key, Object.keys(shortcut)[0])) {
            const currentSequence = conflictingItem.sequences;
            const newSequence = updatedSequence.filter((s) => !currentSequence.includes(s))[0];
            updatedShortcuts[key] = {
                ...conflictingItem,
                sequences: [...currentSequence.filter((s) => !conflict(s, newSequence)), newSequence],
            };
        } else {
            const commonSequences = updatedSequence.map((s) => (
                conflictingItem.sequences.filter((seq) => conflict(seq, s))
            ));
            const newSequences = conflictingItem.sequences.filter((s) => !commonSequences.flat().includes(s));
            updatedShortcuts[key] = { ...conflictingItem, sequences: newSequences };
        }
    }
    registerComponentShortcuts(updatedShortcuts);
}
