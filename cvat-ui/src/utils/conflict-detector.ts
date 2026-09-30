// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { isEqual, cloneDeep } from 'lodash';
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

const shortcutScopeConflicts: Record<ShortcutScope, ShortcutScope[]> = {
    [ShortcutScope.GENERAL]: Object.values(ShortcutScope),
    [ShortcutScope.ANNOTATION_PAGE]: [
        ShortcutScope.GENERAL,
        ShortcutScope.ANNOTATION_PAGE,
        ShortcutScope.OBJECTS_SIDEBAR,
        ShortcutScope.STANDARD_WORKSPACE,
        ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
        ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
        ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE,
        ShortcutScope.TAG_ANNOTATION_WORKSPACE,
        ShortcutScope.REVIEW_WORKSPACE_CONTROLS,
        ShortcutScope['3D_ANNOTATION_WORKSPACE'],
        ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    ],
    [ShortcutScope.OBJECTS_SIDEBAR]: [
        ShortcutScope.GENERAL,
        ShortcutScope.ANNOTATION_PAGE,
        ShortcutScope.OBJECTS_SIDEBAR,
        ShortcutScope.STANDARD_WORKSPACE,
        ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
        ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
        ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE,
        ShortcutScope.TAG_ANNOTATION_WORKSPACE,
        ShortcutScope.REVIEW_WORKSPACE_CONTROLS,
        ShortcutScope['3D_ANNOTATION_WORKSPACE'],
        ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    ],
    [ShortcutScope.STANDARD_WORKSPACE]: [
        ShortcutScope.GENERAL,
        ShortcutScope.STANDARD_WORKSPACE,
        ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
        ShortcutScope.OBJECTS_SIDEBAR,
        ShortcutScope.ANNOTATION_PAGE,
    ],
    [ShortcutScope.STANDARD_WORKSPACE_CONTROLS]: [
        ShortcutScope.GENERAL,
        ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
        ShortcutScope.STANDARD_WORKSPACE,
        ShortcutScope.ANNOTATION_PAGE,
        ShortcutScope.OBJECTS_SIDEBAR,
    ],
    [ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE]: [
        ShortcutScope.GENERAL,
        ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
        ShortcutScope.OBJECTS_SIDEBAR,
        ShortcutScope.ANNOTATION_PAGE,
    ],
    [ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE]: [
        ShortcutScope.GENERAL,
        ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE,
        ShortcutScope.OBJECTS_SIDEBAR,
        ShortcutScope.ANNOTATION_PAGE,
    ],
    [ShortcutScope.TAG_ANNOTATION_WORKSPACE]: [
        ShortcutScope.GENERAL,
        ShortcutScope.TAG_ANNOTATION_WORKSPACE,
        ShortcutScope.OBJECTS_SIDEBAR,
        ShortcutScope.ANNOTATION_PAGE,
    ],
    [ShortcutScope.REVIEW_WORKSPACE_CONTROLS]: [
        ShortcutScope.GENERAL,
        ShortcutScope.REVIEW_WORKSPACE_CONTROLS,
        ShortcutScope.ANNOTATION_PAGE,
        ShortcutScope.OBJECTS_SIDEBAR,
    ],
    [ShortcutScope['3D_ANNOTATION_WORKSPACE']]: [
        ShortcutScope.GENERAL,
        ShortcutScope['3D_ANNOTATION_WORKSPACE'],
        ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
        ShortcutScope.OBJECTS_SIDEBAR,
        ShortcutScope.ANNOTATION_PAGE,
    ],
    [ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS']]: [
        ShortcutScope.GENERAL,
        ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
        ShortcutScope['3D_ANNOTATION_WORKSPACE'],
        ShortcutScope.ANNOTATION_PAGE,
        ShortcutScope.OBJECTS_SIDEBAR,
    ],
    [ShortcutScope.AUDIO_WORKSPACE_CONTROLS]: [
        ShortcutScope.GENERAL,
        ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    ],
    [ShortcutScope.LABELS_EDITOR]: [
        ShortcutScope.GENERAL,
        ShortcutScope.LABELS_EDITOR,
    ],
};

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
    const scopes = shortcutScopeConflicts[scope as ShortcutScope] || [ShortcutScope.GENERAL, scope];

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
    keyMap: KeyMap,
): Record<string, KeyMapItem> | null {
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

function removeConflictingSequences(
    sequences: string[],
    conflictingSequences: string[],
): string[] {
    const isConflict = (sequence: string) => (conflictingSequence: string) => conflict(sequence, conflictingSequence);
    const nonConflictingSequence = (sequence: string): boolean => (
        !conflictingSequences.some(isConflict(sequence))
    );

    return sequences.filter(nonConflictingSequence);
}

export function resolveConflicts(
    updateKeyMap: KeyMap,
    shortcutsKeyMap: KeyMap,
): KeyMap {
    const resultMap = cloneDeep(updateKeyMap);

    Object.entries(resultMap).forEach(([key, currValue]) => {
        const conflicts = conflictDetector({ [key]: currValue }, shortcutsKeyMap);
        if (!conflicts) return;

        Object.keys(conflicts).forEach((conflictingKey) => {
            resultMap[conflictingKey].sequences = removeConflictingSequences(
                resultMap[conflictingKey].sequences,
                conflicts[conflictingKey].sequences,
            );
        });
    });

    return resultMap;
}
