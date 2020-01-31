import { AnyAction } from 'redux';
import { SettingsActionTypes } from 'actions/settings-actions';

import {
    SettingsState,
    GridColor,
    FrameSpeed,
} from './interfaces';

const defaultState: SettingsState = {
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
        default: {
            return state;
        }
    }
};
