// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

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
        owner: {
            label: 'Owner',
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                asyncFetch: asyncFetchUsers,
            },
        },
        type: {
            label: 'Type',
            type: 'select',
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'detector', title: 'Detector' },
                    { value: 'interactor', title: 'Interactor' },
                    { value: 'tracker', title: 'Tracker' },
                    { value: 'reid', title: 'ReID' },
                ],
            },
        },
        id: {
            label: 'ID',
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        created_date: {
            label: 'Created date',
            type: 'datetime',
            operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
        },
        updated_date: {
            label: 'Last updated',
            type: 'datetime',
            operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedModelsFilters';
export const predefinedFilterValues = {};
