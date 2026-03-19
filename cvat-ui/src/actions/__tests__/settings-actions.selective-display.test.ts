// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    switchSelectiveDisplay,
    setSelectiveLabels,
    setSelectiveAttributes,
    SettingsActionTypes,
} from '../settings-actions';

describe('Selective Display Settings Actions', () => {
    describe('switchSelectiveDisplay', () => {
        it('should create action to enable selective display', () => {
            const expectedAction = {
                type: SettingsActionTypes.SWITCH_SELECTIVE_DISPLAY,
                payload: {
                    enableSelectiveDisplay: true,
                },
            };

            expect(switchSelectiveDisplay(true)).toEqual(expectedAction);
        });

        it('should create action to disable selective display', () => {
            const expectedAction = {
                type: SettingsActionTypes.SWITCH_SELECTIVE_DISPLAY,
                payload: {
                    enableSelectiveDisplay: false,
                },
            };

            expect(switchSelectiveDisplay(false)).toEqual(expectedAction);
        });
    });

    describe('setSelectiveLabels', () => {
        it('should create action to set selective labels', () => {
            const labelIds = [1, 2, 3];
            const expectedAction = {
                type: SettingsActionTypes.SET_SELECTIVE_LABELS,
                payload: {
                    selectiveLabels: labelIds,
                },
            };

            expect(setSelectiveLabels(labelIds)).toEqual(expectedAction);
        });

        it('should create action with empty array', () => {
            const expectedAction = {
                type: SettingsActionTypes.SET_SELECTIVE_LABELS,
                payload: {
                    selectiveLabels: [],
                },
            };

            expect(setSelectiveLabels([])).toEqual(expectedAction);
        });
    });

    describe('setSelectiveAttributes', () => {
        it('should create action to set selective attributes for a label', () => {
            const labelId = 1;
            const attributeIds = [1, 2, 3];
            const expectedAction = {
                type: SettingsActionTypes.SET_SELECTIVE_ATTRIBUTES,
                payload: {
                    labelId,
                    attributeIds,
                },
            };

            expect(setSelectiveAttributes(labelId, attributeIds)).toEqual(expectedAction);
        });

        it('should create action with empty attribute array', () => {
            const labelId = 2;
            const expectedAction = {
                type: SettingsActionTypes.SET_SELECTIVE_ATTRIBUTES,
                payload: {
                    labelId,
                    attributeIds: [],
                },
            };

            expect(setSelectiveAttributes(labelId, [])).toEqual(expectedAction);
        });
    });
});