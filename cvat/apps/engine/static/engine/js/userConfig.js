/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported Config */

class Config {
    constructor() {
        this._username = '_default_';
        this._shortkeys = {
            switch_lock_property: {
                value: 'l',
                view_value: 'L',
                description: 'switch lock property for active shape',
            },

            switch_all_lock_property: {
                value: 't l',
                view_value: 'T + L',
                description: 'switch lock property for all shapes on current frame',
            },

            switch_occluded_property: {
                value: 'q,/'.split(','),
                view_value: 'Q or Num Division',
                description: 'switch occluded property for active shape',
            },

            switch_draw_mode: {
                value: 'n',
                view_value: 'N',
                description: 'start draw / stop draw',
            },

            switch_merge_mode: {
                value: 'm',
                view_value: 'M',
                description: 'start merge / apply changes',
            },

            switch_group_mode: {
                value: 'g',
                view_value: 'G',
                description: 'start group / apply changes',
            },

            reset_group: {
                value: 'shift+g',
                view_value: 'Shift + G',
                description: 'reset group for selected shapes',
            },

            change_shape_label: {
                value: 'ctrl+1,ctrl+2,ctrl+3,ctrl+4,ctrl+5,ctrl+6,ctrl+7,ctrl+8,ctrl+9'.split(','),
                view_value: 'Ctrl + (1,2,3,4,5,6,7,8,9)',
                description: 'change shape label for existing object',
            },

            change_default_label: {
                value: 'shift+1,shift+2,shift+3,shift+4,shift+5,shift+6,shift+7,shift+8,shift+9'.split(','),
                view_value: 'Shift + (1,2,3,4,5,6,7,8,9)',
                description: 'change label default label',
            },

            change_shape_color: {
                value: 'enter',
                view_value: 'Enter',
                description: 'change color for highlighted shape',
            },

            change_player_brightness: {
                value: 'shift+b,alt+b'.split(','),
                view_value: 'Shift+B / Alt+B',
                description: 'increase/decrease brightness of an image',
            },

            change_player_contrast: {
                value: 'shift+c,alt+c'.split(','),
                view_value: 'Shift+C / Alt+C',
                description: 'increase/decrease contrast of an image',
            },

            change_player_saturation: {
                value: 'shift+s,alt+s'.split(','),
                view_value: 'Shift+S / Alt+S',
                description: 'increase/decrease saturation of an image',
            },

            switch_hide_mode: {
                value: 'h',
                view_value: 'H',
                description: 'switch hide mode for active shape',
            },

            switch_active_keyframe: {
                value: 'k',
                view_value: 'K',
                description: 'switch keyframe property for active shape',
            },

            switch_active_outside: {
                value: 'o',
                view_value: 'O',
                description: 'switch outside property for active shape',
            },

            switch_all_hide_mode: {
                value: 't h',
                view_value: 'T + H',
                description: 'switch hide mode for all shapes',
            },

            delete_shape: {
                value: 'del,shift+del'.split(','),
                view_value: 'Del, Shift + Del',
                description: 'delete active shape (use shift for force deleting)',
            },

            focus_to_frame: {
                value: '`,~'.split(','),
                view_value: '~ / `',
                description: 'focus to "go to frame" element',
            },

            next_frame: {
                value: 'f',
                view_value: 'F',
                description: 'move to next player frame',
            },

            prev_frame: {
                value: 'd',
                view_value: 'D',
                description: 'move to previous player frame',
            },

            forward_frame: {
                value: 'v',
                view_value: 'V',
                description: 'move forward several frames',
            },

            backward_frame: {
                value: 'c',
                view_value: 'C',
                description: 'move backward several frames',
            },

            next_key_frame: {
                value: 'r',
                view_value: 'R',
                description: 'move to next key frame of highlighted track',
            },

            prev_key_frame: {
                value: 'e',
                view_value: 'E',
                description: 'move to previous key frame of highlighted track',
            },

            prev_filter_frame: {
                value: 'left',
                view_value: 'Left Arrow',
                description: 'move to prev frame which satisfies the filter',
            },

            next_filter_frame: {
                value: 'right',
                view_value: 'Right Arrow',
                description: 'move to next frame which satisfies the filter',
            },

            play_pause: {
                value: 'space',
                view_value: 'Space',
                description: 'switch play / pause of player',
            },

            open_help: {
                value: 'f1',
                view_value: 'F1',
                description: 'open help window',
            },

            open_settings: {
                value: 'f2',
                view_value: 'F2',
                description: 'open settings window ',
            },

            save_work: {
                value: 'ctrl+s',
                view_value: 'Ctrl + S',
                description: 'save work on the server',
            },

            copy_shape: {
                value: 'ctrl+c',
                view_value: 'Ctrl + C',
                description: 'copy active shape to buffer',
            },

            propagate_shape: {
                value: 'ctrl+b',
                view_value: 'Ctrl + B',
                description: 'propagate active shape',
            },

            switch_paste: {
                value: 'ctrl+v',
                view_value: 'Ctrl + V',
                description: 'switch paste mode',
            },

            switch_aam_mode: {
                value: 'shift+enter',
                view_value: 'Shift + Enter',
                description: 'switch attribute annotation mode',
            },

            aam_next_attribute: {
                value: 'down',
                view_value: 'Down Arrow',
                description: 'move to next attribute in attribute annotation mode',
            },

            aam_prev_attribute: {
                value: 'up',
                view_value: 'Up Arrow',
                description: 'move to previous attribute in attribute annotation mode',
            },

            aam_next_shape: {
                value: 'tab',
                view_value: 'Tab',
                description: 'move to next shape in attribute annotation mode',
            },

            aam_prev_shape: {
                value: 'shift+tab',
                view_value: 'Shift + Tab',
                description: 'move to previous shape in attribute annotation mode',
            },

            select_i_attribute: {
                value: '1,2,3,4,5,6,7,8,9,0'.split(','),
                view_value: '1,2,3,4,5,6,7,8,9,0',
                description: 'setup corresponding attribute value in attribute annotation mode',
            },

            change_grid_opacity: {
                value: ['alt+g+=', 'alt+g+-'],
                view_value: 'Alt + G + "+", Alt + G + "-"',
                description: 'increase/decrease grid opacity',
            },

            change_grid_color: {
                value: 'alt+g+enter',
                view_value: 'Alt + G + Enter',
                description: 'change grid color',
            },

            undo: {
                value: 'ctrl+z',
                view_value: 'Ctrl + Z',
                description: 'undo',
            },

            redo: {
                value: ['ctrl+shift+z', 'ctrl+y'],
                view_value: 'Ctrl + Shift + Z / Ctrl + Y',
                description: 'redo',
            },

            cancel_mode: {
                value: 'esc',
                view_value: 'Esc',
                description: 'cancel active mode',
            },

            clockwise_rotation: {
                value: 'ctrl+r',
                view_value: 'Ctrl + R',
                description: 'clockwise image rotation',
            },

            counter_clockwise_rotation: {
                value: 'ctrl+shift+r',
                view_value: 'Ctrl + Shift + R',
                description: 'counter clockwise image rotation',
            },

            next_shape_type: {
                value: ['alt+.'],
                view_value: 'Alt + >',
                description: 'switch next default shape type',
            },

            prev_shape_type: {
                value: ['alt+,'],
                view_value: 'Alt + <',
                description: 'switch previous default shape type',
            },
        };

        if (window.cvat && window.cvat.job && window.cvat.job.z_order) {
            this._shortkeys.inc_z = {
                value: '+,='.split(','),
                view_value: '+',
                description: 'increase z order for active shape',
            };

            this._shortkeys.dec_z = {
                value: '-,_'.split(','),
                view_value: '-',
                description: 'decrease z order for active shape',
            };
        }

        this._settings = {
            player_step: {
                value: '10',
                description: 'step size for player when move on several frames forward/backward',
            },

            player_speed: {
                value: '25 FPS',
                description: 'playback speed of the player',
            },

            reset_zoom: {
                value: 'false',
                description: 'reset frame zoom when move between the frames',
            },

            enable_auto_save: {
                value: 'false',
                description: 'enable auto save ability',
            },

            auto_save_interval: {
                value: '15',
                description: 'auto save interval (min)',
            },
        };

        this._defaultShortkeys = JSON.parse(JSON.stringify(this._shortkeys));
        this._defaultSettings = JSON.parse(JSON.stringify(this._settings));
    }


    reset() {
        this._shortkeys = JSON.parse(JSON.stringify(this._defaultShortkeys));
        this._settings = JSON.parse(JSON.stringify(this._defaultSettings));
    }


    get shortkeys() {
        return JSON.parse(JSON.stringify(this._shortkeys));
    }


    get settings() {
        return JSON.parse(JSON.stringify(this._settings));
    }
}
