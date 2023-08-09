// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';

import { CombinedState, Job, JobsQuery } from 'reducers';
import { SortingComponent, ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import Button from 'antd/lib/button';
import { useSelector } from 'react-redux';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './jobs-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

interface Props {
    query: JobsQuery;
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
}

function openAllJobsInNewTabs(jobs: Job[]) {
    for (const job of jobs) {
        window.open(`/tasks/${job.taskId}/jobs/${job.id}`, '_blank');
    }
}
function TopBarComponent(props: Props): JSX.Element {
    const {
        query, onApplyFilter, onApplySorting, onApplySearch,
    } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);
    const jobs = useSelector((state: CombinedState) => state.jobs.current);

    return (
        <Row className='cvat-jobs-page-top-bar' justify='center' align='middle'>
            <Col md={22} lg={18} xl={16} xxl={16}>
                <div>
                    <Input.Search
                        enterButton
                        onSearch={(phrase: string) => {
                            onApplySearch(phrase);
                        }}
                        defaultValue={query.search || ''}
                        className='cvat-jobs-page-search-bar'
                        placeholder='Search ...'
                    />
                    <div>
                        <Button
                            key='open-jobs'
                            onClick={() => openAllJobsInNewTabs(jobs)}
                            className='cvat-filters-modal-submit-button'
                        >
                            Open all
                        </Button>
                        <SortingComponent
                            visible={visibility.sorting}
                            onVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, sorting: visible })
                            )}
                            defaultFields={query.sort?.split(',') || ['-ID']}
                            sortingFields={['ID', 'Assignee', 'Updated date', 'Stage', 'State', 'Task ID', 'Project ID', 'Task name', 'Project name']}
                            onApplySorting={onApplySorting}
                        />
                        <FilteringComponent
                            value={query.filter}
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
                            onApplyFilter={onApplyFilter}
                        />
                    </div>
                </div>
            </Col>
        </Row>
    );
}

export default React.memo(TopBarComponent);
