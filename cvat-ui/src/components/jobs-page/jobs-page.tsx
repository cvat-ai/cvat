// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';
import { Col, Row } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';
import Empty from 'antd/lib/empty';

import { CombinedState } from 'reducers/interfaces';
import { getJobsAsync } from 'actions/jobs-actions';

import TopBarComponent from './top-bar';
import JobsContentComponent from './jobs-content';

function JobsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const query = useSelector((state: CombinedState) => state.jobs.query);
    const fetching = useSelector((state: CombinedState) => state.jobs.fetching);
    const count = useSelector((state: CombinedState) => state.jobs.count);

    const dimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    const content = count ? (
        <>
            <JobsContentComponent />
            <Row justify='space-around' about='middle'>
                <Col {...dimensions}>
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
    ) : <Empty />;

    return (
        <div className='cvat-jobs-page'>
            <TopBarComponent
                query={query}
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
            { fetching ? (
                <Spin size='large' className='cvat-spinner' />
            ) : content }

        </div>
    );
}

export default React.memo(JobsPageComponent);
