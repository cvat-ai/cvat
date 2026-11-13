// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';

export const config: Partial<Config> = {
    fields: {
        name: {
            label: 'Name',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        description: {
            label: 'Description',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        provider: {
            label: 'Provider',
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                listValues: [
                    { value: 'cvat', title: 'CVAT' },
                    { value: 'huggingface', title: 'Hugging Face' },
                    { value: 'native', title: 'Native' },
                    { value: 'roboflow', title: 'Roboflow' },
                ],
            },
        },
        owner: {
            label: 'Owner',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        created_date: {
            label: 'Created date',
            type: 'datetime',
            operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
        },
        kind: {
            label: 'Kind',
            type: 'select',
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'classifier', title: 'Classifier' },
                    { value: 'detector', title: 'Detector' },
                    { value: 'segmenter', title: 'Segmenter' },
                    { value: 'interactor', title: 'Interactor' },
                    { value: 'tracker', title: 'Tracker' },
                    { value: 'reid', title: 'ReID' },
                ],
            },
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedModelsFilters';
export const predefinedFilterValues = {};
