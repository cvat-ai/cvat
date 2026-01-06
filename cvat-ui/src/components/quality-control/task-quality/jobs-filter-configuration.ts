// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import { Config } from '@react-awesome-query-builder/antd';
import { config as jobPageFilterConfig } from 'components/jobs-page/jobs-filter-configuration';

export const config: Partial<Config> = {
    fields: {
        ..._.pick(
            jobPageFilterConfig.fields, ['state', 'stage', 'assignee', 'updatedDate', 'id', 'task_name', 'task_id'],
        ),
        type: {
            label: '作业类型',
            type: 'select',
            operators: ['select_equals'],
            valueSources: ['value'],
            fieldSettings: {
                listValues: [
                    { value: 'annotation', title: '标注' },
                    { value: 'consensus_replica', title: '共识副本' },
                ],
            },
        },
    },
};

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedQualityJobsFilters';
