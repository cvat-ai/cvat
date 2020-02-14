import { AnyAction } from 'redux';
import { SettingsActionTypes } from 'actions/settings-actions';

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
        gridOpacity: 0,
        brightnessLevel: 50,
        contrastLevel: 50,
        saturationLevel: 50,
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
        default: {
            return state;
        }
    }
};
