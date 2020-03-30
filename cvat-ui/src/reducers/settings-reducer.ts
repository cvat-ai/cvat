// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';

import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { SettingsActionTypes } from 'actions/settings-actions';
import { AnnotationActionTypes } from 'actions/annotation-actions';

import {
    SettingsState,
    GridColor,
    FrameSpeed,
    ColorBy,
} from './interfaces';

const defaultState: SettingsState = {
    shapes: {
        colorBy: ColorBy.INSTANCE,
        opacity: 3,
        selectedOpacity: 30,
        blackBorders: false,
    },
    workspace: {
        autoSave: false,
        autoSaveInterval: 15 * 60 * 1000,
        aamZoomMargin: 100,
        showAllInterpolationTracks: false,
    },
    player: {
        frameStep: 10,
        frameSpeed: FrameSpeed.Usual,
        resetZoom: false,
        rotateAll: false,
        grid: false,
        gridSize: 100,
        gridColor: GridColor.White,
        gridOpacity: 100,
        brightnessLevel: 100,
        contrastLevel: 100,
        saturationLevel: 100,
    },
};

export default (state = defaultState, action: AnyAction): SettingsState => {
    switch (action.type) {
        case SettingsActionTypes.SWITCH_ROTATE_ALL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    rotateAll: action.payload.rotateAll,
                },
            };
        }
        case SettingsActionTypes.SWITCH_GRID: {
            return {
                ...state,
                player: {
                    ...state.player,
                    grid: action.payload.grid,
                },
            };
        }
        case SettingsActionTypes.CHANGE_GRID_SIZE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    gridSize: action.payload.gridSize,
                },
            };
        }
        case SettingsActionTypes.CHANGE_GRID_COLOR: {
            return {
                ...state,
                player: {
                    ...state.player,
                    gridColor: action.payload.gridColor,
                },
            };
        }
        case SettingsActionTypes.CHANGE_GRID_OPACITY: {
            return {
                ...state,
                player: {
                    ...state.player,
                    gridOpacity: action.payload.gridOpacity,
                },
            };
        }
        case SettingsActionTypes.CHANGE_SHAPES_COLOR_BY: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    colorBy: action.payload.colorBy,
                },
            };
        }
        case SettingsActionTypes.CHANGE_SHAPES_OPACITY: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    opacity: action.payload.opacity,
                },
            };
        }
        case SettingsActionTypes.CHANGE_SELECTED_SHAPES_OPACITY: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    selectedOpacity: action.payload.selectedOpacity,
                },
            };
        }
        case SettingsActionTypes.CHANGE_SHAPES_BLACK_BORDERS: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    blackBorders: action.payload.blackBorders,
                },
            };
        }
        case SettingsActionTypes.CHANGE_FRAME_STEP: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frameStep: action.payload.frameStep,
                },
            };
        }
        case SettingsActionTypes.CHANGE_FRAME_SPEED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frameSpeed: action.payload.frameSpeed,
                },
            };
        }
        case SettingsActionTypes.SWITCH_RESET_ZOOM: {
            return {
                ...state,
                player: {
                    ...state.player,
                    resetZoom: action.payload.resetZoom,
                },
            };
        }
        case SettingsActionTypes.CHANGE_BRIGHTNESS_LEVEL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    brightnessLevel: action.payload.level,
                },
            };
        }
        case SettingsActionTypes.CHANGE_CONTRAST_LEVEL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    contrastLevel: action.payload.level,
                },
            };
        }
        case SettingsActionTypes.CHANGE_SATURATION_LEVEL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    saturationLevel: action.payload.level,
                },
            };
        }
        case SettingsActionTypes.SWITCH_AUTO_SAVE: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    autoSave: action.payload.autoSave,
                },
            };
        }
        case SettingsActionTypes.CHANGE_AUTO_SAVE_INTERVAL: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    autoSaveInterval: action.payload.autoSaveInterval,
                },
            };
        }
        case SettingsActionTypes.CHANGE_AAM_ZOOM_MARGIN: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    aamZoomMargin: action.payload.aamZoomMargin,
                },
            };
        }
        case SettingsActionTypes.SWITCH_SHOWNIG_INTERPOLATED_TRACKS: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    showAllInterpolationTracks: action.payload.showAllInterpolationTracks,
                },
            };
        }
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const { job } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    resetZoom: job && job.task.mode === 'annotation',
                },
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
