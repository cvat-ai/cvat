// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import settingsReducer from '../settings-reducer';
import { SettingsActionTypes } from '../../actions/settings-actions';
import { SettingsState } from '../index';

describe('Settings Reducer - Selective Display', () => {
    const initialState: SettingsState = {
        shapes: {
            opacity: 100,
            colorBy: 'Instance',
            selectedOpacity: 100,
            outlined: false,
            outlineColor: '#000000',
            showBitmap: true,
            showProjections: false,
            showGroundTruth: false,
        },
        workspace: {
            autoSave: false,
            autoSaveInterval: 60000,
            aamZoomMargin: 100,
            showAllInterpolationTracks: false,
            showObjectsTextAlways: false,
            automaticBordering: true,
            adaptiveZoom: true,
            intelligentPolygonCrop: true,
            textFontSize: 14,
            controlPointsSize: 5,
            textPosition: 'auto',
            textContent: 'id,label,attributes,source,descriptions',
            showTagsOnFrame: false,
            defaultApproxPolyAccuracy: 9,
            enableSelectiveDisplay: false,
            selectiveLabels: [],
            selectiveAttributes: {},
        },
        player: {
            canvasBackgroundColor: '#000000',
            grid: false,
            gridSize: 100,
            gridColor: 'White',
            gridOpacity: 50,
            brightnessLevel: 50,
            contrastLevel: 50,
            saturationLevel: 50,
            resetZoom: false,
            smoothImage: true,
        },
        imageFilters: [],
    };

    describe('SWITCH_SELECTIVE_DISPLAY', () => {
        it('should enable selective display', () => {
            const action = {
                type: SettingsActionTypes.SWITCH_SELECTIVE_DISPLAY,
                payload: {
                    enableSelectiveDisplay: true,
                },
            };

            const newState = settingsReducer(initialState, action);

            expect(newState.workspace.enableSelectiveDisplay).toBe(true);
            expect(newState).not.toBe(initialState); // Should create new state object
        });

        it('should disable selective display', () => {
            const stateWithSelectiveDisplay = {
                ...initialState,
                workspace: {
                    ...initialState.workspace,
                    enableSelectiveDisplay: true,
                },
            };

            const action = {
                type: SettingsActionTypes.SWITCH_SELECTIVE_DISPLAY,
                payload: {
                    enableSelectiveDisplay: false,
                },
            };

            const newState = settingsReducer(stateWithSelectiveDisplay, action);

            expect(newState.workspace.enableSelectiveDisplay).toBe(false);
        });
    });

    describe('SET_SELECTIVE_LABELS', () => {
        it('should set selective labels', () => {
            const labelIds = [1, 2, 3];
            const action = {
                type: SettingsActionTypes.SET_SELECTIVE_LABELS,
                payload: {
                    selectiveLabels: labelIds,
                },
            };

            const newState = settingsReducer(initialState, action);

            expect(newState.workspace.selectiveLabels).toEqual(labelIds);
            expect(newState.workspace.selectiveLabels).not.toBe(labelIds); // Should be a new array reference
        });

        it('should update existing selective labels', () => {
            const existingState = {
                ...initialState,
                workspace: {
                    ...initialState.workspace,
                    selectiveLabels: [1, 2],
                },
            };

            const newLabelIds = [3, 4, 5];
            const action = {
                type: SettingsActionTypes.SET_SELECTIVE_LABELS,
                payload: {
                    selectiveLabels: newLabelIds,
                },
            };

            const newState = settingsReducer(existingState, action);

            expect(newState.workspace.selectiveLabels).toEqual(newLabelIds);
        });

        it('should set empty array', () => {
            const existingState = {
                ...initialState,
                workspace: {
                    ...initialState.workspace,
                    selectiveLabels: [1, 2, 3],
                },
            };

            const action = {
                type: SettingsActionTypes.SET_SELECTIVE_LABELS,
                payload: {
                    selectiveLabels: [],
                },
            };

            const newState = settingsReducer(existingState, action);

            expect(newState.workspace.selectiveLabels).toEqual([]);
        });
    });

    describe('SET_SELECTIVE_ATTRIBUTES', () => {
        it('should set selective attributes for a label', () => {
            const labelId = 1;
            const attributeIds = [1, 2, 3];
            const action = {
                type: SettingsActionTypes.SET_SELECTIVE_ATTRIBUTES,
                payload: {
                    labelId,
                    attributeIds,
                },
            };

            const newState = settingsReducer(initialState, action);

            expect(newState.workspace.selectiveAttributes[labelId]).toEqual(attributeIds);
            expect(newState.workspace.selectiveAttributes).not.toBe(initialState.workspace.selectiveAttributes);
        });

        it('should update existing selective attributes for a label', () => {
            const existingState = {
                ...initialState,
                workspace: {
                    ...initialState.workspace,
                    selectiveAttributes: {
                        1: [1, 2],
                        2: [3, 4],
                    },
                },
            };

            const labelId = 1;
            const newAttributeIds = [5, 6];
            const action = {
                type: SettingsActionTypes.SET_SELECTIVE_ATTRIBUTES,
                payload: {
                    labelId,
                    attributeIds: newAttributeIds,
                },
            };

            const newState = settingsReducer(existingState, action);

            expect(newState.workspace.selectiveAttributes[labelId]).toEqual(newAttributeIds);
            expect(newState.workspace.selectiveAttributes[2]).toEqual([3, 4]); // Other labels unchanged
        });

        it('should add selective attributes for new label', () => {
            const existingState = {
                ...initialState,
                workspace: {
                    ...initialState.workspace,
                    selectiveAttributes: {
                        1: [1, 2],
                    },
                },
            };

            const newLabelId = 2;
            const attributeIds = [3, 4];
            const action = {
                type: SettingsActionTypes.SET_SELECTIVE_ATTRIBUTES,
                payload: {
                    labelId: newLabelId,
                    attributeIds,
                },
            };

            const newState = settingsReducer(existingState, action);

            expect(newState.workspace.selectiveAttributes[1]).toEqual([1, 2]); // Existing label unchanged
            expect(newState.workspace.selectiveAttributes[2]).toEqual(attributeIds); // New label added
        });

        it('should set empty array for label attributes', () => {
            const existingState = {
                ...initialState,
                workspace: {
                    ...initialState.workspace,
                    selectiveAttributes: {
                        1: [1, 2, 3],
                    },
                },
            };

            const labelId = 1;
            const action = {
                type: SettingsActionTypes.SET_SELECTIVE_ATTRIBUTES,
                payload: {
                    labelId,
                    attributeIds: [],
                },
            };

            const newState = settingsReducer(existingState, action);

            expect(newState.workspace.selectiveAttributes[labelId]).toEqual([]);
        });
    });

    describe('State immutability', () => {
        it('should not mutate the original state', () => {
            const action = {
                type: SettingsActionTypes.SWITCH_SELECTIVE_DISPLAY,
                payload: {
                    enableSelectiveDisplay: true,
                },
            };

            const newState = settingsReducer(initialState, action);

            // Original state should be unchanged
            expect(initialState.workspace.enableSelectiveDisplay).toBe(false);
            
            // New state should be different object
            expect(newState).not.toBe(initialState);
            expect(newState.workspace).not.toBe(initialState.workspace);
        });
    });
});