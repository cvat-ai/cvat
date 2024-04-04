// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';
import { Col, Row } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { Job } from 'cvat-core-wrapper';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { CombinedState, Indexable, JobsQuery } from 'reducers';
import { getJobsAsync, updateJobAsync } from 'actions/jobs-actions';
import { anySearch } from 'utils/any-search';

import TopBarComponent from './top-bar';
import JobsContentComponent from './jobs-content';
import EmptyListComponent from './empty-list';

function JobsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isMounted, setIsMounted] = useState(false);
    const query = useSelector((state: CombinedState) => state.jobs.query);
    const fetching = useSelector((state: CombinedState) => state.jobs.fetching);
    const count = useSelector((state: CombinedState) => state.jobs.count);
    const onJobUpdate = useCallback((job: Job) => {
        dispatch(updateJobAsync(job));
    }, []);

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }

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
            <JobsContentComponent onJobUpdate={onJobUpdate} />
            <Row justify='space-around' about='middle'>
                <Col md={22} lg={18} xl={16} xxl={16}>
                    <Pagination
                        className='cvat-jobs-page-pagination'
                        onChange={(page: number) => {
                            dispatch(getJobsAsync({
                                ...query,
                                page,
                            }));
                        }}
                        showSizeChanger={false}
                        total={count}
                        pageSize={12}
                        current={query.page}
                        showQuickJumper
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
            {fetching ? <Spin size='large' className='cvat-spinner' /> : content}
        </div>
    );
}

export default React.memo(JobsPageComponent);
