// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Fields } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export const fields: Fields = {
    state: {
        label: 'State',
        type: 'select',
        operators: ['select_any_in', 'select_equals'], // ['select_equals', 'select_not_equals', 'select_any_in', 'select_not_any_in']
        valueSources: ['value'],
        fieldSettings: {
            listValues: [
                { value: 'new', title: 'new' },
                { value: 'in progress', title: 'in progress' },
                { value: 'rejected', title: 'rejected' },
                { value: 'completed', title: 'completed' },
            ],
        },
    },
    stage: {
        label: 'Stage',
        type: 'select',
        operators: ['select_any_in', 'select_equals'],
        valueSources: ['value'],
        fieldSettings: {
            listValues: [
                { value: 'annotation', title: 'annotation' },
                { value: 'validation', title: 'validation' },
                { value: 'acceptance', title: 'acceptance' },
            ],
        },
    },
    dimension: {
        label: 'Dimension',
        type: 'select',
        operators: ['select_equals'],
        valueSources: ['value'],
        fieldSettings: {
            listValues: [
                { value: '2d', title: '2D' },
                { value: '3d', title: '3D' },
            ],
        },
    },
    assignee: {
        label: 'Assignee',
        type: 'select',
        valueSources: ['value'],
        operators: ['select_equals'],
        fieldSettings: {
            useAsyncSearch: true,
            forceAsyncSearch: true,
            asyncFetch: asyncFetchUsers,
        },
    },
    updatedDate: {
        label: 'Last updated',
        type: 'datetime',
        operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
    },
    type: {
        label: 'Job Type',
        type: 'select',
        operators: ['select_equals'],
        valueSources: ['value'],
        fieldSettings: {
            listValues: [
                { value: 'annotation', title: 'Annotation' },
                { value: 'ground_truth', title: 'Ground truth' },
                { value: 'consensus_replica', title: 'Consensus replica' },
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
};
