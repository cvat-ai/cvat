// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export const SHORTCUTS_SETTINGS_VERSION = 1;

type SerializedShortcuts = {
    version?: number;
    keyMap: Record<string, { sequences: string[] }>;
};

const shortcutsMigrations: Record<number, (shortcuts: SerializedShortcuts) => void> = {
    1: (shortcuts: SerializedShortcuts): void => {
        const shortcutMigrations: Record<string, string> = {
            SAVE_JOB: 'command+s',
            UNDO: 'command+z',
            REDO: 'command+shift+z',
            AUDIO_UNDO: 'command+z',
            AUDIO_REDO: 'command+shift+z',
            COPY_SHAPE: 'command+c',
            PASTE_SHAPE: 'command+v',
        };

        Object.entries(shortcutMigrations).forEach(([shortcutID, commandSequence]) => {
            const shortcut = shortcuts.keyMap[shortcutID];
            if (shortcut) {
                shortcut.sequences.push(commandSequence);
            }
        });
    },
};

export function migrateShortcutsSettings(shortcuts: SerializedShortcuts): SerializedShortcuts | null {
    if ((shortcuts.version ?? 0) >= SHORTCUTS_SETTINGS_VERSION) {
        return null;
    }

    const migratedShortcuts = structuredClone(shortcuts);
    for (
        let futureVersion = (shortcuts.version ?? 0) + 1;
        futureVersion <= SHORTCUTS_SETTINGS_VERSION;
        futureVersion++
    ) {
        shortcutsMigrations[futureVersion]?.(migratedShortcuts);
    }

    migratedShortcuts.version = SHORTCUTS_SETTINGS_VERSION;
    return migratedShortcuts;
}
