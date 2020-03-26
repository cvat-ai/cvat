// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { KeyMap } from 'react-hotkeys';

import { boundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { ShortcutsActions, ShortcutsActionsTypes } from 'actions/shortcuts-actions';
import { ShortcutsState } from './interfaces';


const defaultState: ShortcutsState = {
    visibleShortcutsHelp: false,
    keyMap: {
        SWITCH_SHORTCUTS: {
            name: 'Show shortcuts',
            description: 'Open/hide the list of available shortcuts',
            sequence: 'f1',
            action: 'keydown',
        },
        OPEN_SETTINGS: {
            name: 'Open settings',
            description: 'Go to the settings page or go back',
            sequence: 'f2',
            action: 'keydown',
        },

        SWITCH_ALL_LOCK: {
            name: 'Lock/unlock all objects',
            description: 'Change locked state for all objects in the side bar',
            sequence: 't+l',
            action: 'keydown',
        },
        SWITCH_LOCK: {
            name: 'Lock/unlock an object',
            description: 'Change locked state for an active object',
            sequence: 'l',
            action: 'keydown',
        },
        SWITCH_ALL_HIDDEN: {
            name: 'Hide/show all objects',
            description: 'Change hidden state for objects in the side bar',
            sequence: 't+h',
            action: 'keydown',
        },
        SWITCH_HIDDEN: {
            name: 'Hide/show an object',
            description: 'Change hidden state for an active object',
            sequence: 'h',
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
            sequence: 'k',
            action: 'keydown',
        },
        SWITCH_OUTSIDE: {
            name: 'Switch outside',
            description: 'Change outside property for an active track',
            sequence: 'o',
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
            sequence: 'ctrl+c',
            action: 'keydown',
        },
        PROPAGATE_OBJECT: {
            name: 'Propagate object',
            description: 'Make a copy of the object on the following frames',
            sequence: 'ctrl+b',
            action: 'keydown',
        },
        NEXT_KEY_FRAME: {
            name: 'Next keyframe',
            description: 'Go to the next keyframe of an active track',
            sequence: 'r',
            action: 'keydown',
        },
        PREV_KEY_FRAME: {
            name: 'Previous keyframe',
            description: 'Go to the previous keyframe of an active track',
            sequence: 'e',
            action: 'keydown',
        },

        NEXT_ATTRIBUTE: {
            name: 'Next attribute',
            description: 'Go to the next attribute',
            sequence: 'ArrowDown',
            action: 'keydown',
        },
        PREVIOUS_ATTRIBUTE: {
            name: 'Previous attribute',
            description: 'Go to the previous attribute',
            sequence: 'ArrowUp',
            action: 'keydown',
        },
        NEXT_OBJECT: {
            name: 'Next object',
            description: 'Go to the next object',
            sequence: 'Tab',
            action: 'keydown',
        },
        PREVIOUS_OBJECT: {
            name: 'Previous object',
            description: 'Go to the previous object',
            sequence: 'Shift+Tab',
            action: 'keydown',
        },

        INCREASE_BRIGHTNESS: {
            name: 'Brightness+',
            description: 'Increase brightness level for the image',
            sequence: 'shift+b+=',
            action: 'keypress',
        },
        DECREASE_BRIGHTNESS: {
            name: 'Brightness-',
            description: 'Decrease brightness level for the image',
            sequence: 'shift+b+-',
            action: 'keydown',
        },
        INCREASE_CONTRAST: {
            name: 'Contrast+',
            description: 'Increase contrast level for the image',
            sequence: 'shift+c+=',
            action: 'keydown',
        },
        DECREASE_CONTRAST: {
            name: 'Contrast-',
            description: 'Decrease contrast level for the image',
            sequence: 'shift+c+-',
            action: 'keydown',
        },
        INCREASE_SATURATION: {
            name: 'Saturation+',
            description: 'Increase saturation level for the image',
            sequence: 'shift+s+=',
            action: 'keydown',
        },
        DECREASE_SATURATION: {
            name: 'Saturation-',
            description: 'Increase contrast level for the image',
            sequence: 'shift+s+-',
            action: 'keydown',
        },
        INCREASE_GRID_OPACITY: {
            name: 'Grid opacity+',
            description: 'Make the grid more visible',
            sequence: 'shift+g+=',
            action: 'keydown',
        },
        DECREASE_GRID_OPACITY: {
            name: 'Grid opacity-',
            description: 'Make the grid less visible',
            sequences: 'shift+g+-',
            action: 'keydown',
        },
        CHANGE_GRID_COLOR: {
            name: 'Grid color',
            description: 'Set another color for the image grid',
            sequence: 'shift+g+enter',
            action: 'keydown',
        },

        PASTE_SHAPE: {
            name: 'Paste shape',
            description: 'Paste a shape from internal CVAT clipboard',
            sequence: 'ctrl+v',
            action: 'keydown',
        },
        SWITCH_DRAW_MODE: {
            name: 'Draw mode',
            description: 'Repeat the latest procedure of drawing with the same parameters',
            sequence: 'n',
            action: 'keydown',
        },
        SWITCH_MERGE_MODE: {
            name: 'Merge mode',
            description: 'Activate or deactivate mode to merging shapes',
            sequence: 'm',
            action: 'keydown',
        },
        SWITCH_GROUP_MODE: {
            name: 'Group mode',
            description: 'Activate or deactivate mode to grouping shapes',
            sequence: 'g',
            action: 'keydown',
        },
        RESET_GROUP: {
            name: 'Reset group',
            description: 'Reset group for selected shapes (in group mode)',
            sequence: 'shift+g',
            action: 'keyup',
        },
        CANCEL: {
            name: 'Cancel',
            description: 'Cancel any active canvas mode',
            sequence: 'esc',
            action: 'keydown',
        },
        CLOCKWISE_ROTATION: {
            name: 'Rotate clockwise',
            description: 'Change image angle (add 90 degrees)',
            sequence: 'ctrl+r',
            action: 'keydown',
        },
        ANTICLOCKWISE_ROTATION: {
            name: 'Rotate anticlockwise',
            description: 'Change image angle (substract 90 degrees)',
            sequence: 'ctrl+shift+r',
            action: 'keydown',
        },

        SAVE_JOB: {
            name: 'Save the job',
            description: 'Send all changes of annotations to the server',
            sequence: 'ctrl+s',
            action: 'keydown',
        },
        UNDO: {
            name: 'Undo action',
            description: 'Cancel the latest action related with objects',
            sequence: 'ctrl+z',
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
            sequence: 'f',
            action: 'keydown',
        },
        PREV_FRAME: {
            name: 'Previous frame',
            description: 'Go to the previous frame',
            sequence: 'd',
            action: 'keydown',
        },
        FORWARD_FRAME: {
            name: 'Forward frame',
            description: 'Go forward with a step',
            sequence: 'v',
            action: 'keydown',
        },
        BACKWARD_FRAME: {
            name: 'Backward frame',
            description: 'Go backward with a step',
            sequence: 'c',
            action: 'keydown',
        },
        SEARCH_FORWARD: {
            name: 'Search forward',
            description: 'Search the next frame that satisfies to the filters',
            sequence: 'right',
            action: 'keydown',
        },
        SEARCH_BACKWARD: {
            name: 'Search backward',
            description: 'Search the previous frame that satisfies to the filters',
            sequence: 'left',
            action: 'keydown',
        },
        PLAY_PAUSE: {
            name: 'Play/pause',
            description: 'Start/stop automatic changing frames',
            sequence: 'space',
            action: 'keydown',
        },
        FOCUS_INPUT_FRAME: {
            name: 'Focus input frame',
            description: 'Focus on the element to change the current frame',
            sequences: ['`', '~'],
            action: 'keydown',
        },
    } as any as KeyMap,
};

export default (
    state = defaultState,
    action: ShortcutsActions | boundariesActions | AuthActions,
): ShortcutsState => {
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
