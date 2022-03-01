// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import { PlusOutlined } from '@ant-design/icons';

import { CloudStoragesQuery } from 'reducers/interfaces';
import Input from 'antd/lib/input';
import { SortingComponent, ResourceFilterHOC } from 'components/resource-sorting-filtering';

import {
    localStorageRecentKeyword, localStorageRecentCapacity,
    predefinedFilterValues, defaultEnabledFilters, config,
} from './cloud-storages-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
    predefinedFilterValues, defaultEnabledFilters,
);

interface Props {
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
    query: CloudStoragesQuery;
}

const defaultVisibility: {
    predefined: boolean;
    recent: boolean;
    builder: boolean;
    sorting: boolean;
} = {
    predefined: false,
    recent: false,
    builder: false,
    sorting: false,
};

export default function StoragesTopBar(props: Props): JSX.Element {
    const {
        query, onApplyFilter, onApplySorting, onApplySearch,
    } = props;
    const history = useHistory();
    const [visibility, setVisibility] = useState<typeof defaultVisibility>(defaultVisibility);

    return (
        <Row justify='space-between' align='middle' className='cvat-cloud-storages-list-top-bar'>
            <Col span={24}>
                <div className='cvat-cloudstorages-page-filters-wrapper'>
                    <Input.Search
                        enterButton
                        onSearch={(phrase: string) => {
                            // onApplySearch(phrase);
                        }}
                        defaultValue={query.search || ''}
                        className='cvat-cloudstorages-page-tasks-search-bar'
                        placeholder='Search ..'
                    />
                    <div>
                        <SortingComponent
                            visible={visibility.sorting}
                            onVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, sorting: visible })
                            )}
                            defaultFields={query.sort?.split(',') || ['ID']}
                            sortingFields={['ID', 'Assignee', 'Updated date', 'Stage', 'State', 'Task ID', 'Project ID', 'Task name', 'Project name']}
                            onApplySorting={() => {
                                // todo
                            }}
                        />
                        <FilteringComponent
                            predefinedVisible={visibility.predefined}
                            builderVisible={visibility.builder}
                            recentVisible={visibility.recent}
                            onPredefinedVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, predefined: visible })
                            )}
                            onBuilderVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visible })
                            )}
                            onRecentVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            )}
                            onApplyFilter={() => {
                                // todo
                            }}
                        />
                    </div>
                </div>
                <Button
                    size='large'
                    className='cvat-attach-cloud-storage-button'
                    type='primary'
                    onClick={(): void => history.push('/cloudstorages/create')}
                    icon={<PlusOutlined />}
                />
            </Col>
        </Row>
    );
}
