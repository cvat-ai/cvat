// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export const config: Partial<Config> = {
    fields: {
        id: {
            label: 'ID',
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        name: {
            label: '名称',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        assignee: {
            label: '负责人',
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                asyncFetch: asyncFetchUsers,
            },
        },
        owner: {
            label: '创建者',
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                asyncFetch: asyncFetchUsers,
            },
        },
        updated_date: {
            label: '最后更新',
            type: 'datetime',
            operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
        },
        status: {
            label: '状态',
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals', 'select_any_in', 'select_not_any_in'],
            fieldSettings: {
                listValues: [
                    { value: 'annotation', title: '标注' },
                    { value: 'validation', title: '验证' },
                    { value: 'completed', title: '已完成' },
                ],
            },
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedProjectsFilters';
export const predefinedFilterValues = {
    '分配给我': '{"and":[{"==":[{"var":"assignee"},"<username>"]}]}',
    '我创建的': '{"and":[{"==":[{"var":"owner"},"<username>"]}]}',
    '未完成': '{"!":{"and":[{"==":[{"var":"status"},"completed"]}]}}',
};

