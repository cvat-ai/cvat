// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { getKeyfromCode, isModifier } from 'utils/key-code-mapper';
import { KeyMap } from 'utils/mousetrap-react';

export const ACTION_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
export const actionShortcutID = (slot: number): string => `VIDEO_ACTION_${slot + 1}`;

const shortcut = (name: string, description: string, sequence: string): KeyMap[string] => ({
    name, description, sequences: [sequence], scope: ShortcutScope.VIDEO_UNDERSTANDING,
});

export const phaseShortcuts: KeyMap = {
    VIDEO_ACTION_TOGGLE: shortcut('Toggle action recording', 'Start or confirm recording on the selected action track', 'm'),
    VIDEO_ACTION_HOLD: shortcut('Hold to play and record', 'Play and record the selected action until the key is released', 'shift+m'),
    VIDEO_EXTEND_EDGE: shortcut('Extend action edge', 'Extend the selected or hovered clip edge one frame', '+'),
    VIDEO_TRIM_EDGE: shortcut('Trim action edge', 'Trim the selected or hovered clip edge one frame', '-'),
    VIDEO_PLAYBACK_TRACK: shortcut('Select playback track', 'Return to the playback track at the current frame', 'r'),
    ...Object.fromEntries(ACTION_KEYS.map((key, index) => [
        actionShortcutID(index), shortcut(`Action track ${index + 1}`, 'Select and record the action in this slot', key),
    ])),
};

registerComponentShortcuts(phaseShortcuts);

export function getShortcutCombination(event: KeyboardEvent): string | null {
    const key = getKeyfromCode(event.code);
    if (!key || isModifier(key)) return null;
    return [
        event.ctrlKey ? 'ctrl' : '',
        event.altKey ? 'alt' : '',
        event.shiftKey ? 'shift' : '',
        event.metaKey ? 'command' : '',
        key,
    ].filter(Boolean).join('+');
}
