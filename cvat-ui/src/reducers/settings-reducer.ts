// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';

import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { SettingsActionTypes } from 'actions/settings-actions';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import {
    SettingsState, GridColor, FrameSpeed, ColorBy,
} from 'reducers';
import { clampOpacity } from 'utils/clamp-opacity';

const defaultState: SettingsState = {
    shapes: {
        colorBy: ColorBy.LABEL,
        opacity: 3,
        selectedOpacity: 30,
        outlined: false,
        outlineColor: '#000000',
        showBitmap: false,
        showProjections: false,
        showGroundTruth: false,
    },
    workspace: {
        autoSave: false,
        autoSaveInterval: 15 * 60 * 1000,
        aamZoomMargin: 100,
        automaticBordering: false,
        showObjectsTextAlways: false,
        showAllInterpolationTracks: false,
        intelligentPolygonCrop: true,
        defaultApproxPolyAccuracy: 9,
        textFontSize: 14,
        controlPointsSize: 5,
        textPosition: 'auto',
        textContent: 'id,source,label,attributes,descriptions',
        toolsBlockerState: {
            algorithmsLocked: false,
            buttonVisible: false,
        },
        showTagsOnFrame: true,
    },
    player: {
        canvasBackgroundColor: '#ffffff',
        frameStep: 10,
        frameSpeed: FrameSpeed.Usual,
        resetZoom: false,
        rotateAll: false,
        smoothImage: true,
        showDeletedFrames: false,
        grid: false,
        gridSize: 100,
        gridColor: GridColor.White,
        gridOpacity: 100,
        brightnessLevel: 100,
        contrastLevel: 100,
        saturationLevel: 100,
    },
    imageFilters: [],
    showDialog: false,
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
        case SettingsActionTypes.CHANGE_SHOW_GROUND_TRUTH: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    showGroundTruth: action.payload.showGroundTruth,
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
        case SettingsActionTypes.CHANGE_SHAPES_OUTLINED_BORDERS: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    outlined: action.payload.outlined,
                    outlineColor: action.payload.color,
                },
            };
        }
        case SettingsActionTypes.CHANGE_SHAPES_SHOW_PROJECTIONS: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    showProjections: action.payload.showProjections,
                },
            };
        }
        case SettingsActionTypes.CHANGE_SHOW_UNLABELED_REGIONS: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    showBitmap: action.payload.showBitmap,
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
        case SettingsActionTypes.SWITCH_SMOOTH_IMAGE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    smoothImage: action.payload.smoothImage,
                },
            };
        }
        case SettingsActionTypes.SWITCH_TEXT_FONT_SIZE: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    textFontSize: action.payload.fontSize,
                },
            };
        }
        case SettingsActionTypes.SWITCH_CONTROL_POINTS_SIZE: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    controlPointsSize: action.payload.controlPointsSize,
                },
            };
        }
        case SettingsActionTypes.SWITCH_TEXT_POSITION: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    textPosition: action.payload.position,
                },
            };
        }
        case SettingsActionTypes.SWITCH_TEXT_CONTENT: {
            const { textContent } = action.payload;
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    textContent,
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
        case SettingsActionTypes.SWITCH_SHOWING_OBJECTS_TEXT_ALWAYS: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    showObjectsTextAlways: action.payload.showObjectsTextAlways,
                },
            };
        }
        case SettingsActionTypes.SWITCH_AUTOMATIC_BORDERING: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    automaticBordering: action.payload.automaticBordering,
                },
            };
        }
        case SettingsActionTypes.SWITCH_INTELLIGENT_POLYGON_CROP: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    intelligentPolygonCrop: action.payload.intelligentPolygonCrop,
                },
            };
        }
        case SettingsActionTypes.CHANGE_CANVAS_BACKGROUND_COLOR: {
            return {
                ...state,
                player: {
                    ...state.player,
                    canvasBackgroundColor: action.payload.color,
                },
            };
        }
        case SettingsActionTypes.CHANGE_DEFAULT_APPROX_POLY_THRESHOLD: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    defaultApproxPolyAccuracy: action.payload.approxPolyAccuracy,
                },
            };
        }
        case SettingsActionTypes.SWITCH_TOOLS_BLOCKER_STATE: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    toolsBlockerState: { ...state.workspace.toolsBlockerState, ...action.payload.toolsBlockerState },
                },
            };
        }
        case SettingsActionTypes.SWITCH_SETTINGS_DIALOG: {
            return {
                ...state,
                showDialog: action.payload.visible,
            };
        }
        case SettingsActionTypes.SET_SETTINGS: {
            return {
                ...state,
                ...action.payload.settings,
            };
        }
        case SettingsActionTypes.SWITCH_SHOWING_DELETED_FRAMES: {
            return {
                ...state,
                player: {
                    ...state.player,
                    showDeletedFrames: action.payload.showDeletedFrames,
                },
            };
        }
        case SettingsActionTypes.SWITCH_SHOWING_TAGS_ON_FRAME: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    showTagsOnFrame: action.payload.showTagsOnFrame,
                },
            };
        }
        case SettingsActionTypes.ENABLE_IMAGE_FILTER: {
            const { filter, options } = action.payload;
            const { alias } = filter;
            const filters = [...state.imageFilters];
            const index = filters.findIndex((imageFilter) => imageFilter.alias === alias);
            if (options && index !== -1) {
                const enabledFilter = filters[index];
                enabledFilter.modifier.currentProcessedImage = null;
                enabledFilter.modifier.configure(options);
                return {
                    ...state,
                    imageFilters: filters,
                };
            }
            return {
                ...state,
                imageFilters: [
                    ...state.imageFilters,
                    action.payload.filter,
                ],
            };
        }
        case SettingsActionTypes.DISABLE_IMAGE_FILTER: {
            const { filterAlias } = action.payload;
            const filters = [...state.imageFilters];
            const index = filters.findIndex((imageFilter) => imageFilter.alias === filterAlias);
            if (index !== -1) {
                filters.splice(index, 1);
            }
            filters.forEach((imageFilter) => {
                imageFilter.modifier.currentProcessedImage = null;
            });
            return {
                ...state,
                imageFilters: filters,
            };
        }
        case SettingsActionTypes.RESET_IMAGE_FILTERS: {
            return {
                ...state,
                imageFilters: [],
            };
        }
        case AnnotationActionTypes.FETCH_ANNOTATIONS_SUCCESS:
        case AnnotationActionTypes.CHANGE_FRAME_SUCCESS: {
            const { states } = action.payload;
            const { shapes } = state;
            const [clampedOpacity, clampedSelectedOpacity] = clampOpacity(states, shapes);
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    opacity: clampedOpacity,
                    selectedOpacity: clampedSelectedOpacity,
                },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const { job, states } = action.payload;
            const { shapes } = state;
            const filters = [...state.imageFilters];
            filters.forEach((imageFilter) => {
                imageFilter.modifier.currentProcessedImage = null;
            });

            const [clampedOpacity, clampedSelectedOpacity] = clampOpacity(states, shapes, job);

            return {
                ...state,
                shapes: {
                    ...defaultState.shapes,
                    opacity: clampedOpacity,
                    selectedOpacity: clampedSelectedOpacity,
                },
                imageFilters: filters,
            };
        }
        case AnnotationActionTypes.INTERACT_WITH_CANVAS: {
            return {
                ...state,
                workspace: {
                    ...state.workspace,
                    toolsBlockerState: {
                        buttonVisible: true,
                        algorithmsLocked: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_WORKSPACE: {
            return {
                ...state,
                shapes: {
                    ...state.shapes,
                    showGroundTruth: false,
                },
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default: {
            return state;
        }
    }
};
