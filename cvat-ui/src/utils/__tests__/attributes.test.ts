// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    orderAttributesByLabel,
    orderAttributesByJobConfig,
    shouldShowLabel,
    filterAttributesForDisplay,
    filterAttributeValuesForDisplay,
    SelectiveDisplaySettings,
} from '../attributes';

describe('Attribute Utilities', () => {
    const mockLabel = {
        id: 1,
        attributes: [
            { id: 1, name: 'color' },
            { id: 2, name: 'size' },
            { id: 3, name: 'visible' },
        ],
    };

    const mockValues = [
        { id: 3, name: 'visible', value: 'yes' },
        { id: 1, name: 'color', value: 'red' },
        { id: 2, name: 'size', value: 'large' },
    ];

    const mockJobAttributes = {
        1: [
            { id: 1, name: 'color' },
            { id: 2, name: 'size' },
            { id: 3, name: 'visible' },
        ],
    };

    describe('orderAttributesByLabel', () => {
        it('should order attributes by label definition order', () => {
            const result = orderAttributesByLabel(mockLabel, mockValues);
            
            expect(result).toHaveLength(3);
            expect(result[0].name).toBe('color');
            expect(result[1].name).toBe('size');
            expect(result[2].name).toBe('visible');
        });

        it('should handle missing attributes gracefully', () => {
            const partialValues = [
                { id: 1, name: 'color', value: 'red' },
                { id: 3, name: 'visible', value: 'yes' },
            ];

            const result = orderAttributesByLabel(mockLabel, partialValues);
            
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('color');
            expect(result[1].name).toBe('visible');
        });

        it('should handle attributes without IDs using name matching', () => {
            const valuesWithoutIds = [
                { name: 'visible', value: 'yes' },
                { name: 'color', value: 'red' },
            ];

            const result = orderAttributesByLabel(mockLabel, valuesWithoutIds);
            
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('color');
            expect(result[1].name).toBe('visible');
        });
    });

    describe('orderAttributesByJobConfig', () => {
        it('should order attributes using job configuration', () => {
            const result = orderAttributesByJobConfig(mockJobAttributes, 1, mockValues);
            
            expect(result).toHaveLength(3);
            expect(result[0].name).toBe('color');
            expect(result[1].name).toBe('size');
            expect(result[2].name).toBe('visible');
        });

        it('should fall back to original order if no job config found', () => {
            const result = orderAttributesByJobConfig({}, 1, mockValues);
            
            expect(result).toEqual(mockValues);
        });
    });

    describe('shouldShowLabel', () => {
        const selectiveSettings: SelectiveDisplaySettings = {
            enableSelectiveDisplay: true,
            selectiveLabels: [1, 2],
            selectiveAttributes: {},
        };

        it('should return true for selected labels when enabled', () => {
            expect(shouldShowLabel(1, selectiveSettings)).toBe(true);
            expect(shouldShowLabel(2, selectiveSettings)).toBe(true);
        });

        it('should return false for non-selected labels when enabled', () => {
            expect(shouldShowLabel(3, selectiveSettings)).toBe(false);
        });

        it('should return true for all labels when selective display is disabled', () => {
            const disabledSettings = { ...selectiveSettings, enableSelectiveDisplay: false };
            
            expect(shouldShowLabel(1, disabledSettings)).toBe(true);
            expect(shouldShowLabel(2, disabledSettings)).toBe(true);
            expect(shouldShowLabel(3, disabledSettings)).toBe(true);
        });
    });

    describe('filterAttributesForDisplay', () => {
        const selectiveSettings: SelectiveDisplaySettings = {
            enableSelectiveDisplay: true,
            selectiveLabels: [1],
            selectiveAttributes: {
                1: [1, 3], // Only show color and visible attributes for label 1
            },
        };

        it('should filter attributes based on selective display settings', () => {
            const attributes = [
                { id: 1, name: 'color' },
                { id: 2, name: 'size' },
                { id: 3, name: 'visible' },
            ];

            const result = filterAttributesForDisplay(attributes, 1, selectiveSettings);
            
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('color');
            expect(result[1].name).toBe('visible');
        });

        it('should return all attributes when selective display is disabled', () => {
            const disabledSettings = { ...selectiveSettings, enableSelectiveDisplay: false };
            const attributes = [
                { id: 1, name: 'color' },
                { id: 2, name: 'size' },
                { id: 3, name: 'visible' },
            ];

            const result = filterAttributesForDisplay(attributes, 1, disabledSettings);
            
            expect(result).toEqual(attributes);
        });

        it('should return empty array if no attributes are allowed', () => {
            const noAttributesSettings = {
                ...selectiveSettings,
                selectiveAttributes: { 1: [] },
            };
            
            const attributes = [
                { id: 1, name: 'color' },
                { id: 2, name: 'size' },
            ];

            const result = filterAttributesForDisplay(attributes, 1, noAttributesSettings);
            
            expect(result).toEqual([]);
        });
    });

    describe('filterAttributeValuesForDisplay', () => {
        const selectiveSettings: SelectiveDisplaySettings = {
            enableSelectiveDisplay: true,
            selectiveLabels: [1],
            selectiveAttributes: {
                1: [1, 3], // Only show attributes with IDs 1 and 3
            },
        };

        it('should filter attribute values based on selective display settings', () => {
            const attributeValues = {
                '1': 'red',
                '2': 'large',
                '3': 'yes',
            };

            const result = filterAttributeValuesForDisplay(attributeValues, 1, selectiveSettings);
            
            expect(Object.keys(result)).toHaveLength(2);
            expect(result['1']).toBe('red');
            expect(result['3']).toBe('yes');
            expect(result['2']).toBeUndefined();
        });

        it('should return all values when selective display is disabled', () => {
            const disabledSettings = { ...selectiveSettings, enableSelectiveDisplay: false };
            const attributeValues = {
                '1': 'red',
                '2': 'large',
                '3': 'yes',
            };

            const result = filterAttributeValuesForDisplay(attributeValues, 1, disabledSettings);
            
            expect(result).toEqual(attributeValues);
        });

        it('should return empty object if no attributes are allowed', () => {
            const noAttributesSettings = {
                ...selectiveSettings,
                selectiveAttributes: { 1: [] },
            };
            
            const attributeValues = {
                '1': 'red',
                '2': 'large',
            };

            const result = filterAttributeValuesForDisplay(attributeValues, 1, noAttributesSettings);
            
            expect(result).toEqual({});
        });
    });
});