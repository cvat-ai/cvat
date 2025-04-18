// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import { fields } from 'components/common/filters/job-filter-configuration-base';

export const config: Partial<Config> = {
    fields: {
        ...fields,
        task_id: {
            label: 'Task ID',
            type: 'number',
            operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            fieldSettings: { min: 0 },
            valueSources: ['value'],
        },
        task_name: {
            label: 'Task name',
            type: 'text',
            valueSources: ['value'],
            operators: ['like'],
        },
        type: {
            label: 'Job Type',
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'annotation', title: 'Annotation' },
                    { value: 'consensus_replica', title: 'Consensus replica' },
                ],
            },
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedQualitySettingsJobsFilters';
