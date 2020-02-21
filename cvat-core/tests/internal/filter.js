/*
 * Copyright (C) 2018-2020 Intel Corporation
 * SPDX-License-Identifier: MIT
*/

/* global
    require:false
    jest:false
    describe:false
*/

// Setup mock for a server
jest.mock('../../src/server-proxy', () => {
    const mock = require('../mocks/server-proxy.mock');
    return mock;
});

const AnnotationsFilter = require('../../src/annotations-filter');
// Initialize api
window.cvat = require('../../src/api');

// Test cases
describe('Feature: toJSONQuery', () => {
    test('convert filters to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        const [groups, query] = annotationsFilter.toJSONQuery([]);
        expect(Array.isArray(groups)).toBeTruthy();
        expect(typeof (query)).toBe('string');
    });

    test('convert empty fitlers to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        const [, query] = annotationsFilter.toJSONQuery([]);
        expect(query).toBe('$.objects[*].clientID');
    });

    test('convert wrong fitlers (empty string) to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        expect(() => {
            annotationsFilter.toJSONQuery(['']);
        }).toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('convert wrong fitlers (wrong number argument) to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        expect(() => {
            annotationsFilter.toJSONQuery(1);
        }).toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('convert wrong fitlers (wrong array argument) to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        expect(() => {
            annotationsFilter.toJSONQuery(['clientID ==6', 1]);
        }).toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('convert wrong filters (wrong expression) to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        expect(() => {
            annotationsFilter.toJSONQuery(['clientID=5']);
        }).toThrow(window.cvat.exceptions.ArgumentError);
    });

    test('convert filters to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        const [groups, query] = annotationsFilter
            .toJSONQuery(['clientID==5 & shape=="rectangle" & label==["car"]']);
        expect(groups).toEqual([
            ['clientID==5', '&', 'shape=="rectangle"', '&', 'label==["car"]'],
        ]);
        expect(query).toBe('$.objects[?((@.clientID==5&@.shape=="rectangle"&@.label==["car"]))].clientID');
    });

    test('convert filters to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        const [groups, query] = annotationsFilter
            .toJSONQuery(['label=="car" | width >= height & type=="track"']);
        expect(groups).toEqual([
            ['label=="car"', '|', 'width >= height', '&', 'type=="track"'],
        ]);
        expect(query).toBe('$.objects[?((@.label=="car"|@.width>=@.height&@.type=="track"))].clientID');
    });

    test('convert filters to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        const [groups, query] = annotationsFilter
            .toJSONQuery(['label=="person" & attr["Attribute 1"] ==attr["Attribute 2"]']);
        expect(groups).toEqual([
            ['label=="person"', '&', 'attr["Attribute 1"] ==attr["Attribute 2"]'],
        ]);
        expect(query).toBe('$.objects[?((@.label=="person"&@.attr["Attribute 1"]==@.attr["Attribute 2"]))].clientID');
    });

    test('convert filters to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        const [groups, query] = annotationsFilter
            .toJSONQuery(['label=="car" & attr["parked"]==true', 'label=="pedestrian" & width > 150']);
        expect(groups).toEqual([
            ['label=="car"', '&', 'attr["parked"]==true'],
            '|',
            ['label=="pedestrian"', '&', 'width > 150'],
        ]);
        expect(query).toBe('$.objects[?((@.label=="car"&@.attr["parked"]==true)|(@.label=="pedestrian"&@.width>150))].clientID');
    });

    test('convert filters to a json query', () => {
        const annotationsFilter = new AnnotationsFilter();
        const [groups, query] = annotationsFilter
            .toJSONQuery(['(( label==["car \\"mazda\\""]) & (attr["sunglass ( help ) es"]==true | (width > 150 | height > 150 & (clientID == serverID))))) ']);
        expect(groups).toEqual([[[
            ['label==["car `mazda`"]'],
            '&',
            ['attr["sunglass ( help ) es"]==true', '|',
                ['width > 150', '|', 'height > 150', '&',
                    [
                        'clientID == serverID',
                    ],
                ],
            ],
        ]]]);
        expect(query).toBe('$.objects[?((((@.label==["car `mazda`"])&(@.attr["sunglass ( help ) es"]==true|(@.width>150|@.height>150&(@.clientID==serverID))))))].clientID');
    });
});
