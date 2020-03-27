// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExtendedKeyMapOptions } from 'react-hotkeys';

/* eslint-disable-next-line import/prefer-default-export */
export function formatShortcuts(shortcuts: ExtendedKeyMapOptions): string {
    const list: string[] = shortcuts.sequences as string[];
    return `[${list.map((shortcut: string): string => {
        let keys = shortcut.split('+');
        keys = keys.map((key: string): string => `${key ? key[0].toUpperCase() : key}${key.slice(1)}`);
        keys = keys.join('+').split(/\s/g);
        keys = keys.map((key: string): string => `${key ? key[0].toUpperCase() : key}${key.slice(1)}`);
        return keys.join(' ');
    }).join(', ')}]`;
}
