// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export const config: Partial<Config> = {
    fields: {
        user: {
            label: 'User',
            type: 'select',
            valueSources: ['value'],
            operators: ['select_equals'],
            fieldSettings: {
                useAsyncSearch: true,
                forceAsyncSearch: true,
                asyncFetch: asyncFetchUsers,
            },
        },
        role: {
            label: 'Role',
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'worker', title: 'Worker' },
                    { value: 'supervisor', title: 'Supervisor' },
                    { value: 'maintainer', title: 'Maintainer' },
                    { value: 'owner', title: 'Owner' },
                ],
            },
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedMembershipsFilters';
export const predefinedFilterValues = {
    Workers: '{"and":[{"==":[{"var":"role"},"worker"]}]}',
    Supervisors: '{"and":[{"==":[{"var":"role"},"supervisor"]}]}',
    Maintainers: '{"and":[{"==":[{"var":"role"},"maintainer"]}]}',
};
