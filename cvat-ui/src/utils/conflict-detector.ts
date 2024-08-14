import { isEqual } from 'lodash';
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

    if (scope === ShortcutScope.GLOBAL) {
        scopes.push(...Object.keys(flatKeyMap));
    } else {
        scopes.push(ShortcutScope.GLOBAL);
        if (scope === ShortcutScope.ANNOTATION_PAGE) {
            scopes.push(
                scope,
                ...Object.keys(flatKeyMap).filter(
                    (s) => s.includes('WORKSPACE') || s.includes('SIDE_BAR'),
                ),
            );
        } else if (scope.includes('WORKSPACE')) {
            scopes.push(
                scope,
                ShortcutScope.ANNOTATION_PAGE,
                ShortcutScope.CONTROLS_SIDE_BAR,
                ShortcutScope.OBJECTS_SIDE_BAR,
            );
        } else if (scope.includes('SIDE_BAR')) {
            scopes.push(
                ShortcutScope.ANNOTATION_PAGE,
                ShortcutScope.CONTROLS_SIDE_BAR,
                ShortcutScope.OBJECTS_SIDE_BAR,
                ...Object.keys(flatKeyMap).filter((s) => s.includes('WORKSPACE')),
            );
        } else {
            scopes.push(scope);
        }
    }

    for (const s of scopes) {
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
                    const conflictingAction = Object.keys(flatKeyMapUpdated.items)
                        .find((a) => flatKeyMapUpdated.items[a].sequences.includes(existingSequence));
                    conflictingItems[conflictingAction!] = flatKeyMapUpdated.items[conflictingAction!];
                }
            }
        }

        flatKeyMap[scope].sequences.push(...sequences);
        flatKeyMap[scope].items[label] = keyMapItem;
    }

    return Object.keys(conflictingItems).length ? conflictingItems : null;
}
