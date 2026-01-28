// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';
import { Col, Row } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { CombinedState, JobsQuery, SelectedResourceType } from 'reducers';
import { getJobsAsync } from 'actions/jobs-actions';
import { anySearch } from 'utils/any-search';
import { useResourceQuery } from 'utils/hooks';
import { selectionActions } from 'actions/selection-actions';

import TopBarComponent from './top-bar';
import JobsContentComponent from './jobs-content';
import EmptyListComponent from './empty-list';

function JobsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isMounted, setIsMounted] = useState(false);
    const {
        query,
        fetching,
        count,
        currentJobs,
        selectedCount,
        bulkFetching,
    } = useSelector((state: CombinedState) => ({
        query: state.jobs.query,
        fetching: state.jobs.fetching,
        count: state.jobs.count,
        currentJobs: state.jobs.current,
        selectedCount: state.jobs.selected.length,
        bulkFetching: state.bulkActions.fetching,
    }), shallowEqual);

    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(
            currentJobs.map((j) => j.id),
            SelectedResourceType.JOBS,
        ));
    }, [currentJobs]);

    const updatedQuery = useResourceQuery<JobsQuery>(query, { pageSize: 12 });

    useEffect(() => {
        dispatch(getJobsAsync({ ...updatedQuery }));
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            history.replace({
                search: updateHistoryFromQuery(query),
            });
        }
    }, [query]);

    const isAnySearch = anySearch<JobsQuery>(query);

    const content = count ? (
        <>
            <JobsContentComponent />
            <Row justify='space-around' about='middle' className='cvat-resource-pagination-wrapper'>
                <Col md={22} lg={18} xl={16} xxl={16}>
                    <Pagination
                        className='cvat-jobs-page-pagination'
                        onChange={(page: number, pageSize: number) => {
                            dispatch(getJobsAsync({
                                ...query,
                                page,
                                pageSize,
                            }));
                        }}
                        total={count}
                        pageSizeOptions={[12, 24, 48, 96]}
                        current={query.page}
                        pageSize={query.pageSize}
                        showQuickJumper
                        showSizeChanger
                    />
                </Col>
            </Row>
        </>
    ) : (
        <EmptyListComponent notFound={isAnySearch} />
    );

    return (
        <div className='cvat-jobs-page'>
            <TopBarComponent
                query={updatedQuery}
                selectedCount={selectedCount}
                onSelectAll={onSelectAll}
                onApplySearch={(search: string | null) => {
                    dispatch(
                        getJobsAsync({
                            ...query,
                            search,
                            page: 1,
                        }),
                    );
                }}
                onApplyFilter={(filter: string | null) => {
                    dispatch(
                        getJobsAsync({
                            ...query,
                            filter,
                            page: 1,
                        }),
                    );
                }}
                onApplySorting={(sorting: string | null) => {
                    dispatch(
                        getJobsAsync({
                            ...query,
                            sort: sorting,
                            page: 1,
                        }),
                    );
                }}
            />
            {fetching && !bulkFetching ? <Spin size='large' className='cvat-spinner' /> : content}
        </div>
    );
}

export default React.memo(JobsPageComponent);
