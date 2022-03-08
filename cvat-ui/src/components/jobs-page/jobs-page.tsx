// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';
import { Col, Row } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';
import Empty from 'antd/lib/empty';
import Text from 'antd/lib/typography/Text';

import FeedbackComponent from 'components/feedback/feedback';
import { CombinedState, Indexable } from 'reducers/interfaces';
import { getJobsAsync } from 'actions/jobs-actions';

import TopBarComponent from './top-bar';
import JobsContentComponent from './jobs-content';

function JobsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const query = useSelector((state: CombinedState) => state.jobs.query);
    const fetching = useSelector((state: CombinedState) => state.jobs.fetching);
    const count = useSelector((state: CombinedState) => state.jobs.count);

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || (updatedQuery as Indexable)[key];
        if (key === 'page') {
            updatedQuery.page = +updatedQuery.page;
        }
    }

    useEffect(() => {
        dispatch(getJobsAsync({ ...updatedQuery }));
    }, []);

    useEffect(() => {
        const newQueryString = new URLSearchParams({
            ...(query.filter ? { filter: query.filter } : {}),
            ...(query.search ? { search: query.search } : {}),
            ...(query.sort ? { sort: query.sort } : {}),
            ...(query.page ? { page: `${query.page}` } : {}),
        });

        history.replace({
            search: newQueryString.toString(),
        });
    }, [query]);

    const content = count ? (
        <>
            <JobsContentComponent />
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
    ) : <Empty description={<Text>No results matched your search...</Text>} />;

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
            { fetching ? (
                <Spin size='large' className='cvat-spinner' />
            ) : content }
            <FeedbackComponent />
        </div>
    );
}

export default React.memo(JobsPageComponent);
