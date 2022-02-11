// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Table from 'antd/lib/table';
import { FilterValue, TablePaginationConfig } from 'antd/lib/table/interface';

import { JobsQuery } from 'reducers/interfaces';
import UserSelector, { User } from 'components/task-page/user-selector';
import Button from 'antd/lib/button';

interface Props {
    onChangeFilters(filters: Record<string, string | null>): void;
    query: JobsQuery;
}

function TopBarComponent(props: Props): JSX.Element {
    const { query, onChangeFilters } = props;

    const columns = [
        {
            title: 'Stage',
            dataIndex: 'stage',
            key: 'stage',
            filteredValue: query.stage?.split(',') || null,
            className: `${query.stage ? 'cvat-jobs-page-filter cvat-jobs-page-filter-active' : 'cvat-jobs-page-filter'}`,
            filters: [
                { text: 'annotation', value: 'annotation' },
                { text: 'validation', value: 'validation' },
                { text: 'acceptance', value: 'acceptance' },
            ],
        },
        {
            title: 'State',
            dataIndex: 'state',
            key: 'state',
            filteredValue: query.state?.split(',') || null,
            className: `${query.state ? 'cvat-jobs-page-filter cvat-jobs-page-filter-active' : 'cvat-jobs-page-filter'}`,
            filters: [
                { text: 'new', value: 'new' },
                { text: 'in progress', value: 'in progress' },
                { text: 'completed', value: 'completed' },
                { text: 'rejected', value: 'rejected' },
            ],
        },
        {
            title: 'Assignee',
            dataIndex: 'assignee',
            key: 'assignee',
            filteredValue: query.assignee ? [query.assignee] : null,
            className: `${query.assignee ? 'cvat-jobs-page-filter cvat-jobs-page-filter-active' : 'cvat-jobs-page-filter'}`,
            filterDropdown: (
                <div className='cvat-jobs-filter-dropdown-users'>
                    <UserSelector
                        username={query.assignee ? query.assignee : undefined}
                        value={null}
                        onSelect={(value: User | null): void => {
                            if (value) {
                                if (query.assignee !== value.username) {
                                    onChangeFilters({ assignee: value.username });
                                }
                            } else if (query.assignee !== null) {
                                onChangeFilters({ assignee: null });
                            }
                        }}
                    />
                    <Button disabled={query.assignee === null} type='link' onClick={() => onChangeFilters({ assignee: null })}>
                        Reset
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <Row className='cvat-jobs-page-top-bar' justify='center' align='middle'>
            <Col md={22} lg={18} xl={16} xxl={16}>
                <Row justify='space-between' align='bottom'>
                    <Col>
                        <Text className='cvat-title'>Jobs</Text>
                    </Col>
                    <Table
                        onChange={(_: TablePaginationConfig, filters: Record<string, FilterValue | null>) => {
                            const processed = Object.fromEntries(
                                Object.entries(filters)
                                    .map(([key, values]) => (
                                        [key, typeof values === 'string' || values === null ? values : values.join(',')]
                                    )),
                            );
                            onChangeFilters(processed);
                        }}
                        className='cvat-jobs-page-filters'
                        columns={columns}
                        size='small'
                    />
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(TopBarComponent);
