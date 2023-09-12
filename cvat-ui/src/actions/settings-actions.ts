// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import {
    GridColor, ColorBy, SettingsState, ToolsBlockerState,
} from 'reducers';
import { ImageFilter, ImageFilterAlias } from 'utils/image-processing';

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
    CHANGE_SHOW_GROUND_TRUTH = 'CHANGE_SHOW_GROUND_TRUTH',
    CHANGE_FRAME_STEP = 'CHANGE_FRAME_STEP',
    CHANGE_FRAME_SPEED = 'CHANGE_FRAME_SPEED',
    SWITCH_RESET_ZOOM = 'SWITCH_RESET_ZOOM',
    SWITCH_SMOOTH_IMAGE = 'SWITCH_SMOOTH_IMAGE',
    SWITCH_TEXT_FONT_SIZE = 'SWITCH_TEXT_FONT_SIZE',
    SWITCH_CONTROL_POINTS_SIZE = 'SWITCH_CONTROL_POINTS_SIZE',
    SWITCH_TEXT_POSITION = 'SWITCH_TEXT_POSITION',
    SWITCH_TEXT_CONTENT = 'SWITCH_TEXT_CONTENT',
    CHANGE_BRIGHTNESS_LEVEL = 'CHANGE_BRIGHTNESS_LEVEL',
    CHANGE_CONTRAST_LEVEL = 'CHANGE_CONTRAST_LEVEL',
    CHANGE_SATURATION_LEVEL = 'CHANGE_SATURATION_LEVEL',
    SWITCH_AUTO_SAVE = 'SWITCH_AUTO_SAVE',
    CHANGE_AUTO_SAVE_INTERVAL = 'CHANGE_AUTO_SAVE_INTERVAL',
    CHANGE_AAM_ZOOM_MARGIN = 'CHANGE_AAM_ZOOM_MARGIN',
    CHANGE_DEFAULT_APPROX_POLY_THRESHOLD = 'CHANGE_DEFAULT_APPROX_POLY_THRESHOLD',
    SWITCH_AUTOMATIC_BORDERING = 'SWITCH_AUTOMATIC_BORDERING',
    SWITCH_INTELLIGENT_POLYGON_CROP = 'SWITCH_INTELLIGENT_POLYGON_CROP',
    SWITCH_SHOWNIG_INTERPOLATED_TRACKS = 'SWITCH_SHOWNIG_INTERPOLATED_TRACKS',
    SWITCH_SHOWING_OBJECTS_TEXT_ALWAYS = 'SWITCH_SHOWING_OBJECTS_TEXT_ALWAYS',
    CHANGE_CANVAS_BACKGROUND_COLOR = 'CHANGE_CANVAS_BACKGROUND_COLOR',
    SWITCH_SETTINGS_DIALOG = 'SWITCH_SETTINGS_DIALOG',
    SET_SETTINGS = 'SET_SETTINGS',
    SWITCH_TOOLS_BLOCKER_STATE = 'SWITCH_TOOLS_BLOCKER_STATE',
    SWITCH_SHOWING_DELETED_FRAMES = 'SWITCH_SHOWING_DELETED_FRAMES',
    SWITCH_SHOWING_TAGS_ON_FRAME = 'SWITCH_SHOWING_TAGS_ON_FRAME',
    ENABLE_IMAGE_FILTER = 'ENABLE_IMAGE_FILTER',
    DISABLE_IMAGE_FILTER = 'DISABLE_IMAGE_FILTER',
    RESET_IMAGE_FILTERS = 'RESET_IMAGE_FILTERS',
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

export function changeShowGroundTruth(showGroundTruth: boolean): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_SHOW_GROUND_TRUTH,
        payload: {
            showGroundTruth,
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

export function switchSmoothImage(enabled: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_SMOOTH_IMAGE,
        payload: {
            smoothImage: enabled,
        },
    };
}

export function switchTextFontSize(fontSize: number): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_TEXT_FONT_SIZE,
        payload: {
            fontSize,
        },
    };
}

export function switchControlPointsSize(pointsSize: number): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_CONTROL_POINTS_SIZE,
        payload: {
            controlPointsSize: pointsSize,
        },
    };
}

export function switchTextPosition(position: 'auto' | 'center'): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_TEXT_POSITION,
        payload: {
            position,
        },
    };
}

export function switchTextContent(textContent: string[]): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_TEXT_CONTENT,
        payload: {
            textContent: textContent.join(','),
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

export function switchIntelligentPolygonCrop(intelligentPolygonCrop: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_INTELLIGENT_POLYGON_CROP,
        payload: {
            intelligentPolygonCrop,
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

export function switchSettingsModalVisible(visible: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_SETTINGS_DIALOG,
        payload: { visible },
    };
}

export function changeDefaultApproxPolyAccuracy(approxPolyAccuracy: number): AnyAction {
    return {
        type: SettingsActionTypes.CHANGE_DEFAULT_APPROX_POLY_THRESHOLD,
        payload: {
            approxPolyAccuracy,
        },
    };
}

export function switchToolsBlockerState(toolsBlockerState: ToolsBlockerState): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_TOOLS_BLOCKER_STATE,
        payload: {
            toolsBlockerState,
        },
    };
}

export function setSettings(settings: Partial<SettingsState>): AnyAction {
    return {
        type: SettingsActionTypes.SET_SETTINGS,
        payload: {
            settings,
        },
    };
}

export function switchShowingDeletedFrames(showDeletedFrames: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_SHOWING_DELETED_FRAMES,
        payload: {
            showDeletedFrames,
        },
    };
}

export function switchShowingTagsOnFrame(showTagsOnFrame: boolean): AnyAction {
    return {
        type: SettingsActionTypes.SWITCH_SHOWING_TAGS_ON_FRAME,
        payload: {
            showTagsOnFrame,
        },
    };
}

export function enableImageFilter(filter: ImageFilter, options: object | null = null): AnyAction {
    return {
        type: SettingsActionTypes.ENABLE_IMAGE_FILTER,
        payload: {
            filter,
            options,
        },
    };
}

export function disableImageFilter(filterAlias: ImageFilterAlias): AnyAction {
    return {
        type: SettingsActionTypes.DISABLE_IMAGE_FILTER,
        payload: {
            filterAlias,
        },
    };
}

export function resetImageFilters(): AnyAction {
    return {
        type: SettingsActionTypes.RESET_IMAGE_FILTERS,
        payload: {},
    };
}
