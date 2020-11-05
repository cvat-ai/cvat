// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { GridColor, ColorBy } from 'reducers/interfaces';

export enum SettingsActionTypes {
    SWITCH_ROTATE_ALL = 'SWITCH_ROTATE_ALL',
    SWITCH_GRID = 'SWITCH_GRID',
    CHANGE_GRID_SIZE = 'CHANGE_GRID_SIZE',
    CHANGE_GRID_COLOR = 'CHANGE_GRID_COLOR',
    CHANGE_GRID_OPACITY = 'CHANGE_GRID_OPACITY',
    CHANGE_SHAPES_OPACITY = 'CHANGE_SHAPES_OPACITY',
    CHANGE_SELECTED_SHAPES_OPACITY = 'CHANGE_SELECTED_SHAPES_OPACITY',
    CHANGE_SHAPES_COLOR_BY = 'CHANGE_SHAPES_COLOR_BY',
    CHANGE_SHAPES_OUTLINED_BORDERS = 'CHANGE_SHAPES_OUTLINED_BORDERS',
    CHANGE_SHAPES_SHOW_PROJECTIONS = 'CHANGE_SHAPES_SHOW_PROJECTIONS',
    CHANGE_SHOW_UNLABELED_REGIONS = 'CHANGE_SHOW_UNLABELED_REGIONS',
    CHANGE_FRAME_STEP = 'CHANGE_FRAME_STEP',
    CHANGE_FRAME_SPEED = 'CHANGE_FRAME_SPEED',
    SWITCH_RESET_ZOOM = 'SWITCH_RESET_ZOOM',
    CHANGE_BRIGHTNESS_LEVEL = 'CHANGE_BRIGHTNESS_LEVEL',
    CHANGE_CONTRAST_LEVEL = 'CHANGE_CONTRAST_LEVEL',
    CHANGE_SATURATION_LEVEL = 'CHANGE_SATURATION_LEVEL',
    SWITCH_AUTO_SAVE = 'SWITCH_AUTO_SAVE',
    CHANGE_AUTO_SAVE_INTERVAL = 'CHANGE_AUTO_SAVE_INTERVAL',
    CHANGE_AAM_ZOOM_MARGIN = 'CHANGE_AAM_ZOOM_MARGIN',
    SWITCH_AUTOMATIC_BORDERING = 'SWITCH_AUTOMATIC_BORDERING',
    SWITCH_SHOWNIG_INTERPOLATED_TRACKS = 'SWITCH_SHOWNIG_INTERPOLATED_TRACKS',
    SWITCH_SHOWING_OBJECTS_TEXT_ALWAYS = 'SWITCH_SHOWING_OBJECTS_TEXT_ALWAYS',
    CHANGE_CANVAS_BACKGROUND_COLOR = 'CHANGE_CANVAS_BACKGROUND_COLOR',
    SWITCH_SETTINGS_DIALOG = 'SWITCH_SETTINGS_DIALOG',
}

export function changeShapesOpacity(opacity: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SHAPES_OPACITY,
        payload: {
            opacity,
        },
    };
}

export function changeSelectedShapesOpacity(selectedOpacity: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SELECTED_SHAPES_OPACITY,
        payload: {
            selectedOpacity,
        },
    };
}

export function changeShapesColorBy(colorBy: ColorBy): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SHAPES_COLOR_BY,
        payload: {
            colorBy,
        },
    };
}

export function changeShapesOutlinedBorders(outlined: boolean, color: string): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SHAPES_OUTLINED_BORDERS,
        payload: {
            outlined,
            color,
        },
    };
}

export function changeShowBitmap(showBitmap: boolean): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SHOW_UNLABELED_REGIONS,
        payload: {
            showBitmap,
        },
    };
}

export function changeShowProjections(showProjections: boolean): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SHAPES_SHOW_PROJECTIONS,
        payload: {
            showProjections,
        },
    };
}

export function switchRotateAll(rotateAll: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_ROTATE_ALL,
        payload: {
            rotateAll,
        },
    };
}

export function switchGrid(grid: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_GRID,
        payload: {
            grid,
        },
    };
}

export function changeGridSize(gridSize: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_GRID_SIZE,
        payload: {
            gridSize,
        },
    };
}

export function changeGridColor(gridColor: GridColor): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_GRID_COLOR,
        payload: {
            gridColor,
        },
    };
}

export function changeGridOpacity(gridOpacity: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_GRID_OPACITY,
        payload: {
            gridOpacity,
        },
    };
}

export function changeFrameStep(frameStep: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_FRAME_STEP,
        payload: {
            frameStep,
        },
    };
}

export function changeFrameSpeed(frameSpeed: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_FRAME_SPEED,
        payload: {
            frameSpeed,
        },
    };
}

export function switchResetZoom(resetZoom: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_RESET_ZOOM,
        payload: {
            resetZoom,
        },
    };
}

export function changeBrightnessLevel(level: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_BRIGHTNESS_LEVEL,
        payload: {
            level,
        },
    };
}

export function changeContrastLevel(level: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_CONTRAST_LEVEL,
        payload: {
            level,
        },
    };
}

export function changeSaturationLevel(level: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SATURATION_LEVEL,
        payload: {
            level,
        },
    };
}

export function switchAutoSave(autoSave: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_AUTO_SAVE,
        payload: {
            autoSave,
        },
    };
}

export function changeAutoSaveInterval(autoSaveInterval: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_AUTO_SAVE_INTERVAL,
        payload: {
            autoSaveInterval,
        },
    };
}

export function changeAAMZoomMargin(aamZoomMargin: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_AAM_ZOOM_MARGIN,
        payload: {
            aamZoomMargin,
        },
    };
}

export function switchShowingInterpolatedTracks(showAllInterpolationTracks: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_SHOWNIG_INTERPOLATED_TRACKS,
        payload: {
            showAllInterpolationTracks,
        },
    };
}

export function switchShowingObjectsTextAlways(showObjectsTextAlways: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_SHOWING_OBJECTS_TEXT_ALWAYS,
        payload: {
            showObjectsTextAlways,
        },
    };
}

export function switchAutomaticBordering(automaticBordering: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_AUTOMATIC_BORDERING,
        payload: {
            automaticBordering,
        },
    };
}

export function changeCanvasBackgroundColor(color: string): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_CANVAS_BACKGROUND_COLOR,
        payload: {
            color,
        },
    };
}

export function switchSettingsDialog(show?: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_SETTINGS_DIALOG,
        payload: {
            show,
        },
    };
}
