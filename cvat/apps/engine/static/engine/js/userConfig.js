/* exported userConfig */
"use strict";


class Config {
    constructor() {
        this._username = "_default_";
        this._shortkeys = {
            switch_lock_property: {
                value: "l",
                view_value: "L",
                description: "switch lock property for highlighted track"
            },

            switch_all_lock_property: {
                value: "l t",
                view_value: "L + T",
                description: "switch lock property for all current tracks"
            },

            switch_occluded_property: {
                value: "q,-",
                view_value: "Q or Num-",
                description: "switch occluded property for highlighted track"
            },

            switch_draw_mode: {
                value: "n",
                view_value: "N",
                description: "open/close draw mode"
            },

            switch_merge_mode: {
                value: "m",
                view_value: "M",
                description: "open/apply merge mode"
            },

            cancel_merge_mode: {
                value: "ctrl+m",
                view_value: "Ctrl + M",
                description: "close merge mode without apply the merge"
            },

            change_default_label: {
                value: "ctrl+1,ctrl+2,ctrl+3,ctrl+4,ctrl+5,ctrl+6,ctrl+7,ctrl+8,ctrl+9",
                view_value: "Ctrl + (1,2,3,4,5,6,7,8,9)",
                description: "change default label when draw new object"
            },

            change_track_label: {
                value: "shift+1,shift+2,shift+3,shift+4,shift+5,shift+6,shift+7,shift+8,shift+9",
                view_value: "Shift + (1,2,3,4,5,6,7,8,9)",
                description: "change label for active track"
            },

            change_shape_color: {
                value: "enter",
                view_value: "Enter",
                description: "change color for highligted shape"
            },

            change_player_brightness: {
                value: "shift+b,alt+b",
                view_value: "Shift+B / Ctrl+B",
                description: "increase/decrease brightness of an image"
            },

            change_player_contrast: {
                value: "shift+c,alt+c",
                view_value: "Shift+C / Ctrl+C",
                description: "increase/decrease contrast of an image"
            },

            change_player_saturation: {
                value: "shift+s,alt+s",
                view_value: "Shift+S / Ctrl+S",
                description: "increase/decrease saturation of an image"
            },

            hide_shapes: {
                value: "h",
                view_value: "H",
                description: "hide shapes on the frame"
            },

            hide_labels: {
                value: "j",
                view_value: "J",
                description: "hide labels on the frame"
            },

            hide_filtered_tracks: {
                value: "k",
                view_value: "K",
                description: "hide filtered tracks on the frame"
            },

            delete_track: {
                value: "del,shift+del",
                view_value: "Del, Shift + Del",
                description: "delete highlighted track (use shift for force deleting)"
            },

            focus_to_frame: {
                value: '`,~',
                view_value: '~ / `',
                description: "focus to 'go to frame' element"
            },

            next_frame: {
                value: "f",
                view_value: "F",
                description: "move to next player frame"
            },

            prev_frame: {
                value: "d",
                view_value: "D",
                description: "move to previous player frame"
            },

            forward_frame: {
                value: "v",
                view_value: "V",
                description: "move forward several frames"
            },

            backward_frame: {
                value: "c",
                view_value: "C",
                description: "move backward several frames"
            },

            next_key_frame: {
                value: "r",
                view_value: "R",
                description: "move to next key frame of highlighted track"
            },

            prev_key_frame: {
                value: "e",
                view_value: "E",
                description: "move to previous key frame of highlighted track"
            },

            prev_filter_frame: {
                value: 'left',
                view_value: 'Left Arrow',
                description: 'move to prev frame which satisfies the filter'
            },

            next_filter_frame: {
                value: 'right',
                view_value: 'Right Arrow',
                description: 'move to next frame which satisfies the filter'
            },

            play_pause: {
                value: "space",
                view_value: "Space",
                description: "switch play / pause of player"
            },

            open_help: {
                value: "f1",
                view_value: "F1",
                description: "open help window"
            },

            open_settings: {
                value: "f2",
                view_value: "F2",
                description: "open settings window "
            },

            save_work: {
                value: "ctrl+s",
                view_value: "Ctrl + S",
                description: "save work on the server"
            },

            copy_shape: {
                value: "ctrl+c",
                view_value: "Ctrl + C",
                description: "copy highlighted shape to buffer"
            },

            paste_shape: {
                value: "ctrl+v",
                view_value: "Ctrl + V",
                description: "paste shape from buffer"
            },

            cancel_pasting: {
                value: "esc",
                view_value: "Esc",
                description: "close paste mode without new track inserting"
            },

            switch_aam_mode: {
                value: "shift+enter",
                view_value: "Shift + Enter",
                description: "switch attribute annotation mode"
            },

            aam_next_attribute: {
                value: "down",
                view_value: "Down Arrow",
                description: "move to next attribute in attribute annotation mode"
            },

            aam_prev_attribute: {
                value: "up",
                view_value: "Up Arrow",
                description: "move to previous attribute in attribute annotation mode"
            },

            aam_next_track: {
                value: "tab",
                view_value: "Tab",
                description: "move to next track in attribute annotation mode"
            },

            aam_prev_track: {
                value: "shift+tab",
                view_value: "Shift + Tab",
                description: "move to previous track in attribute annotation mode"
            },

            select_i_attribute: {
                value: "1,2,3,4,5,6,7,8,9,0",
                view_value: "1,2,3,4,5,6,7,8,9,0",
                description: "setup corresponding attribute value in attribute annotation mode"
            },
        };


        this._settings = {
            player_step: {
                value: "10",
                description: "step size for player when move on several frames forward/backward"
            },

            player_speed: {
                value: "25 FPS",
                description: "playback speed of the player"
            },

            reset_zoom: {
                value: "false",
                description: "reset frame zoom when move beetween the frames"
            },

            enable_auto_save: {
                value: "false",
                description: "enable auto save ability"
            },

            auto_save_interval: {
                value: "15",
                description: "auto save interval (min)"
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


let userConfig = new Config();
