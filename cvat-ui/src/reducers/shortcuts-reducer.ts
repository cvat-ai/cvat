// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExtendedKeyMapOptions } from 'react-hotkeys';

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { ShortcutsActions, ShortcutsActionsTypes } from 'actions/shortcuts-actions';
import { ShortcutsState } from './interfaces';

function formatShortcuts(shortcuts: ExtendedKeyMapOptions): string {
    const list: string[] = shortcuts.sequences as string[];
    return `[${list
        .map((shortcut: string): string => {
            let keys = shortcut.split('+');
            keys = keys.map((key: string): string => `${key ? key[0].toUpperCase() : key}${key.slice(1)}`);
            keys = keys.join('+').split(/\s/g);
            keys = keys.map((key: string): string => `${key ? key[0].toUpperCase() : key}${key.slice(1)}`);
            return keys.join(' ');
        })
        .join(', ')}]`;
}

const defaultKeyMap = ({
    SWITCH_SHORTCUTS: {
        name: 'Show shortcuts',
        description: 'Open/hide the list of available shortcuts',
        sequences: ['f1'],
        action: 'keydown',
    },
    SWITCH_SETTINGS: {
        name: 'Show settings',
        description: 'Open/hide settings dialog',
        sequences: ['f2'],
        action: 'keydown',
    },

    SWITCH_ALL_LOCK: {
        name: 'Lock/unlock all objects',
        description: 'Change locked state for all objects in the side bar',
        sequences: ['t+l'],
        action: 'keydown',
    },
    SWITCH_LOCK: {
        name: 'Lock/unlock an object',
        description: 'Change locked state for an active object',
        sequences: ['l'],
        action: 'keydown',
    },
    SWITCH_ALL_HIDDEN: {
        name: 'Hide/show all objects',
        description: 'Change hidden state for objects in the side bar',
        sequences: ['t+h'],
        action: 'keydown',
    },
    SWITCH_HIDDEN: {
        name: 'Hide/show an object',
        description: 'Change hidden state for an active object',
        sequences: ['h'],
        action: 'keydown',
    },
    SWITCH_OCCLUDED: {
        name: 'Switch occluded',
        description: 'Change occluded property for an active object',
        sequences: ['q', '/'],
        action: 'keydown',
    },
    SWITCH_KEYFRAME: {
        name: 'Switch keyframe',
        description: 'Change keyframe property for an active track',
        sequences: ['k'],
        action: 'keydown',
    },
    SWITCH_OUTSIDE: {
        name: 'Switch outside',
        description: 'Change outside property for an active track',
        sequences: ['o'],
        action: 'keydown',
    },
    DELETE_OBJECT: {
        name: 'Delete object',
        description: 'Delete an active object. Use shift to force delete of locked objects',
        sequences: ['del', 'shift+del'],
        action: 'keydown',
    },
    TO_BACKGROUND: {
        name: 'To background',
        description: 'Put an active object "farther" from the user (decrease z axis value)',
        sequences: ['-', '_'],
        action: 'keydown',
    },
    TO_FOREGROUND: {
        name: 'To foreground',
        description: 'Put an active object "closer" to the user (increase z axis value)',
        sequences: ['+', '='],
        action: 'keydown',
    },
    COPY_SHAPE: {
        name: 'Copy shape',
        description: 'Copy shape to CVAT internal clipboard',
        sequences: ['ctrl+c'],
        action: 'keydown',
    },
    PROPAGATE_OBJECT: {
        name: 'Propagate object',
        description: 'Make a copy of the object on the following frames',
        sequences: ['ctrl+b'],
        action: 'keydown',
    },
    NEXT_KEY_FRAME: {
        name: 'Next keyframe',
        description: 'Go to the next keyframe of an active track',
        sequences: ['r'],
        action: 'keydown',
    },
    PREV_KEY_FRAME: {
        name: 'Previous keyframe',
        description: 'Go to the previous keyframe of an active track',
        sequences: ['e'],
        action: 'keydown',
    },

    NEXT_ATTRIBUTE: {
        name: 'Next attribute',
        description: 'Go to the next attribute',
        sequences: ['ArrowDown'],
        action: 'keydown',
    },
    PREVIOUS_ATTRIBUTE: {
        name: 'Previous attribute',
        description: 'Go to the previous attribute',
        sequences: ['ArrowUp'],
        action: 'keydown',
    },
    NEXT_OBJECT: {
        name: 'Next object',
        description: 'Go to the next object',
        sequences: ['Tab'],
        action: 'keydown',
    },
    PREVIOUS_OBJECT: {
        name: 'Previous object',
        description: 'Go to the previous object',
        sequences: ['Shift+Tab'],
        action: 'keydown',
    },

    INCREASE_BRIGHTNESS: {
        name: 'Brightness+',
        description: 'Increase brightness level for the image',
        sequences: ['shift+b+='],
        action: 'keypress',
    },
    DECREASE_BRIGHTNESS: {
        name: 'Brightness-',
        description: 'Decrease brightness level for the image',
        sequences: ['shift+b+-'],
        action: 'keydown',
    },
    INCREASE_CONTRAST: {
        name: 'Contrast+',
        description: 'Increase contrast level for the image',
        sequences: ['shift+c+='],
        action: 'keydown',
    },
    DECREASE_CONTRAST: {
        name: 'Contrast-',
        description: 'Decrease contrast level for the image',
        sequences: ['shift+c+-'],
        action: 'keydown',
    },
    INCREASE_SATURATION: {
        name: 'Saturation+',
        description: 'Increase saturation level for the image',
        sequences: ['shift+s+='],
        action: 'keydown',
    },
    DECREASE_SATURATION: {
        name: 'Saturation-',
        description: 'Increase contrast level for the image',
        sequences: ['shift+s+-'],
        action: 'keydown',
    },
    INCREASE_GRID_OPACITY: {
        name: 'Grid opacity+',
        description: 'Make the grid more visible',
        sequences: ['shift+g+='],
        action: 'keydown',
    },
    DECREASE_GRID_OPACITY: {
        name: 'Grid opacity-',
        description: 'Make the grid less visible',
        sequences: ['shift+g+-'],
        action: 'keydown',
    },
    CHANGE_GRID_COLOR: {
        name: 'Grid color',
        description: 'Set another color for the image grid',
        sequences: ['shift+g+enter'],
        action: 'keydown',
    },

    PASTE_SHAPE: {
        name: 'Paste shape',
        description: 'Paste a shape from internal CVAT clipboard',
        sequences: ['ctrl+v'],
        action: 'keydown',
    },
    SWITCH_DRAW_MODE: {
        name: 'Draw mode',
        description:
            'Repeat the latest procedure of drawing with the same parameters (shift to redraw an existing shape)',
        sequences: ['shift+n', 'n'],
        action: 'keydown',
    },
    SWITCH_MERGE_MODE: {
        name: 'Merge mode',
        description: 'Activate or deactivate mode to merging shapes',
        sequences: ['m'],
        action: 'keydown',
    },
    SWITCH_SPLIT_MODE: {
        name: 'Split mode',
        description: 'Activate or deactivate mode to splitting shapes',
        sequences: ['alt+m'],
        action: 'keydown',
    },
    SWITCH_GROUP_MODE: {
        name: 'Group mode',
        description: 'Activate or deactivate mode to grouping shapes',
        sequences: ['g'],
        action: 'keydown',
    },
    RESET_GROUP: {
        name: 'Reset group',
        description: 'Reset group for selected shapes (in group mode)',
        sequences: ['shift+g'],
        action: 'keyup',
    },
    CANCEL: {
        name: 'Cancel',
        description: 'Cancel any active canvas mode',
        sequences: ['esc'],
        action: 'keydown',
    },
    CLOCKWISE_ROTATION: {
        name: 'Rotate clockwise',
        description: 'Change image angle (add 90 degrees)',
        sequences: ['ctrl+r'],
        action: 'keydown',
    },
    ANTICLOCKWISE_ROTATION: {
        name: 'Rotate anticlockwise',
        description: 'Change image angle (substract 90 degrees)',
        sequences: ['ctrl+shift+r'],
        action: 'keydown',
    },

    SAVE_JOB: {
        name: 'Save the job',
        description: 'Send all changes of annotations to the server',
        sequences: ['ctrl+s'],
        action: 'keydown',
    },
    UNDO: {
        name: 'Undo action',
        description: 'Cancel the latest action related with objects',
        sequences: ['ctrl+z'],
        action: 'keydown',
    },
    REDO: {
        name: 'Redo action',
        description: 'Cancel undo action',
        sequences: ['ctrl+shift+z', 'ctrl+y'],
        action: 'keydown',
    },
    NEXT_FRAME: {
        name: 'Next frame',
        description: 'Go to the next frame',
        sequences: ['f'],
        action: 'keydown',
    },
    PREV_FRAME: {
        name: 'Previous frame',
        description: 'Go to the previous frame',
        sequences: ['d'],
        action: 'keydown',
    },
    FORWARD_FRAME: {
        name: 'Forward frame',
        description: 'Go forward with a step',
        sequences: ['v'],
        action: 'keydown',
    },
    BACKWARD_FRAME: {
        name: 'Backward frame',
        description: 'Go backward with a step',
        sequences: ['c'],
        action: 'keydown',
    },
    SEARCH_FORWARD: {
        name: 'Search forward',
        description: 'Search the next frame that satisfies to the filters',
        sequences: ['right'],
        action: 'keydown',
    },
    SEARCH_BACKWARD: {
        name: 'Search backward',
        description: 'Search the previous frame that satisfies to the filters',
        sequences: ['left'],
        action: 'keydown',
    },
    PLAY_PAUSE: {
        name: 'Play/pause',
        description: 'Start/stop automatic changing frames',
        sequences: ['space'],
        action: 'keydown',
    },
    FOCUS_INPUT_FRAME: {
        name: 'Focus input frame',
        description: 'Focus on the element to change the current frame',
        sequences: ['`', '~'],
        action: 'keydown',
    },
    SWITCH_AUTOMATIC_BORDERING: {
        name: 'Switch automatic bordering',
        description: 'Switch automatic bordering for polygons and polylines during drawing/editing',
        sequences: ['Control'],
        action: 'keydown',
    },
    CHANGE_OBJECT_COLOR: {
        name: 'Change color',
        description: 'Set the next color for an activated shape',
        sequences: ['Enter'],
        action: 'keydown',
    },
} as any) as Record<string, ExtendedKeyMapOptions>;

const defaultState: ShortcutsState = {
    visibleShortcutsHelp: false,
    keyMap: defaultKeyMap,
    normalizedKeyMap: Object.keys(defaultKeyMap).reduce((acc: Record<string, string>, key: string) => {
        const normalized = formatShortcuts(defaultKeyMap[key]);
        acc[key] = normalized;
        return acc;
    }, {}),
};

export default (state = defaultState, action: ShortcutsActions | BoundariesActions | AuthActions): ShortcutsState => {
    switch (action.type) {
        case ShortcutsActionsTypes.SWITCH_SHORTCUT_DIALOG: {
            return {
                ...state,
                visibleShortcutsHelp: !state.visibleShortcutsHelp,
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
