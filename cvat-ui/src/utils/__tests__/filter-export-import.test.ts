// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    createFilterExportData,
    extractFilterLogic,
    validateFilterData,
    createShareableURL,
    extractFilterFromURL,
    cleanFilterFromURL,
    FilterExportData,
} from '../filter-export-import';

// Mock window.location for testing
const mockLocation = {
    href: 'http://localhost:3000/tasks/1/jobs/1',
    pathname: '/tasks/1/jobs/1',
    search: '',
    origin: 'http://localhost:3000',
};

// Mock URL constructor
(global as any).URL = jest.fn().mockImplementation((url: string) => {
    const urlObj = new URL(url);
    return {
        ...urlObj,
        searchParams: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            toString: jest.fn(),
        },
    };
});

// Mock window object
Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
});

describe('Filter Export/Import Utilities', () => {
    const sampleFilterLogic = {
        and: [
            { '==': [{ var: 'label' }, 'car'] },
            { '==': [{ var: 'type' }, 'shape'] }
        ]
    };

    const sampleHumanReadable = 'Label == "car" AND Type == "shape"';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createFilterExportData', () => {
        it('should create properly formatted export data', () => {
            const result = createFilterExportData(sampleFilterLogic, sampleHumanReadable);

            expect(result).toMatchObject({
                version: '1.0',
                filter: sampleFilterLogic,
                humanReadable: sampleHumanReadable,
            });
            expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should handle empty filter logic', () => {
            const result = createFilterExportData({}, '');

            expect(result.filter).toEqual({});
            expect(result.humanReadable).toBe('');
            expect(result.version).toBe('1.0');
        });
    });

    describe('extractFilterLogic', () => {
        it('should extract filter from new format with metadata', () => {
            const exportData: FilterExportData = {
                version: '1.0',
                timestamp: '2024-01-01T00:00:00.000Z',
                filter: sampleFilterLogic,
                humanReadable: sampleHumanReadable,
            };

            const result = extractFilterLogic(exportData);
            expect(result).toEqual(sampleFilterLogic);
        });

        it('should extract filter from legacy format (raw logic)', () => {
            const result = extractFilterLogic(sampleFilterLogic);
            expect(result).toEqual(sampleFilterLogic);
        });

        it('should return null for invalid data', () => {
            expect(extractFilterLogic(null)).toBeNull();
            expect(extractFilterLogic(undefined)).toBeNull();
            expect(extractFilterLogic('')).toBeNull();
            expect(extractFilterLogic(123)).toBeNull();
        });

        it('should return null for empty object', () => {
            expect(extractFilterLogic({})).toBeNull();
        });
    });

    describe('validateFilterData', () => {
        it('should validate new format data', () => {
            const validData = {
                version: '1.0',
                filter: sampleFilterLogic,
                humanReadable: sampleHumanReadable,
            };

            expect(validateFilterData(validData)).toBe(true);
        });

        it('should validate legacy format data', () => {
            expect(validateFilterData(sampleFilterLogic)).toBe(true);
        });

        it('should validate JSON string data', () => {
            const jsonString = JSON.stringify(sampleFilterLogic);
            expect(validateFilterData(jsonString)).toBe(true);
        });

        it('should reject invalid data', () => {
            expect(validateFilterData(null)).toBe(false);
            expect(validateFilterData(undefined)).toBe(false);
            expect(validateFilterData('')).toBe(false);
            expect(validateFilterData('invalid json')).toBe(false);
            expect(validateFilterData(123)).toBe(false);
            expect(validateFilterData({})).toBe(false);
        });
    });

    describe('createShareableURL', () => {
        it('should create URL with filter parameter', () => {
            // Mock URL constructor behavior
            const mockURL = {
                searchParams: {
                    set: jest.fn(),
                },
                toString: jest.fn().mockReturnValue('http://localhost:3000/tasks/1/jobs/1?filter=encoded-filter'),
            };
            (global as any).URL = jest.fn().mockReturnValue(mockURL);

            const result = createShareableURL(sampleFilterLogic);

            expect(global.URL).toHaveBeenCalledWith(mockLocation.href);
            expect(mockURL.searchParams.set).toHaveBeenCalledWith(
                'filter',
                encodeURIComponent(JSON.stringify(sampleFilterLogic))
            );
            expect(result).toBe('http://localhost:3000/tasks/1/jobs/1?filter=encoded-filter');
        });

        it('should use custom base URL when provided', () => {
            const customURL = 'http://example.com/test';
            const mockURL = {
                searchParams: { set: jest.fn() },
                toString: jest.fn().mockReturnValue(`${customURL}?filter=encoded`),
            };
            (global as any).URL = jest.fn().mockReturnValue(mockURL);

            createShareableURL(sampleFilterLogic, customURL);

            expect(global.URL).toHaveBeenCalledWith(customURL);
        });
    });

    describe('extractFilterFromURL', () => {
        it('should extract filter from URL with filter parameter', () => {
            const filterParam = encodeURIComponent(JSON.stringify(sampleFilterLogic));
            const testURL = `http://localhost:3000/tasks/1/jobs/1?filter=${filterParam}`;

            // Mock URL constructor to return proper searchParams
            const mockSearchParams = {
                get: jest.fn().mockReturnValue(filterParam),
            };
            const mockURL = {
                searchParams: mockSearchParams,
            };
            (global as any).URL = jest.fn().mockReturnValue(mockURL);

            const result = extractFilterFromURL(testURL);

            expect(result).toEqual(sampleFilterLogic);
            expect(mockSearchParams.get).toHaveBeenCalledWith('filter');
        });

        it('should return null when no filter parameter exists', () => {
            const mockSearchParams = {
                get: jest.fn().mockReturnValue(null),
            };
            (global as any).URL = jest.fn().mockReturnValue({
                searchParams: mockSearchParams,
            });

            const result = extractFilterFromURL('http://localhost:3000/tasks/1/jobs/1');

            expect(result).toBeNull();
        });

        it('should return null when filter parameter is invalid JSON', () => {
            const mockSearchParams = {
                get: jest.fn().mockReturnValue('invalid-json'),
            };
            (global as any).URL = jest.fn().mockReturnValue({
                searchParams: mockSearchParams,
            });

            const result = extractFilterFromURL('http://localhost:3000/tasks/1/jobs/1?filter=invalid-json');

            expect(result).toBeNull();
        });

        it('should use window.location.href when no URL provided', () => {
            const filterParam = encodeURIComponent(JSON.stringify(sampleFilterLogic));
            mockLocation.search = `?filter=${filterParam}`;

            const mockSearchParams = {
                get: jest.fn().mockReturnValue(filterParam),
            };
            (global as any).URL = jest.fn().mockReturnValue({
                searchParams: mockSearchParams,
            });

            const result = extractFilterFromURL();

            expect(global.URL).toHaveBeenCalledWith(mockLocation.href);
            expect(result).toEqual(sampleFilterLogic);
        });
    });

    describe('cleanFilterFromURL', () => {
        beforeEach(() => {
            // Mock URLSearchParams
            const mockURLSearchParams = {
                delete: jest.fn(),
                toString: jest.fn().mockReturnValue(''),
            };
            (global as any).URLSearchParams = jest.fn().mockReturnValue(mockURLSearchParams);
        });

        it('should remove filter parameter and return clean URL', () => {
            mockLocation.pathname = '/tasks/1/jobs/1';
            mockLocation.search = '?filter=some-filter&other=param';

            const mockURLSearchParams = {
                delete: jest.fn(),
                toString: jest.fn().mockReturnValue('other=param'),
            };
            (global as any).URLSearchParams = jest.fn().mockReturnValue(mockURLSearchParams);

            const result = cleanFilterFromURL();

            expect(mockURLSearchParams.delete).toHaveBeenCalledWith('filter');
            expect(result).toBe('/tasks/1/jobs/1?other=param');
        });

        it('should return path only when no other parameters remain', () => {
            mockLocation.pathname = '/tasks/1/jobs/1';
            mockLocation.search = '?filter=some-filter';

            const mockURLSearchParams = {
                delete: jest.fn(),
                toString: jest.fn().mockReturnValue(''),
            };
            (global as any).URLSearchParams = jest.fn().mockReturnValue(mockURLSearchParams);

            const result = cleanFilterFromURL();

            expect(result).toBe('/tasks/1/jobs/1');
        });
    });
});