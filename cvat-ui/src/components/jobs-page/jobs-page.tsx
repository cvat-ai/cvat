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

import { CombinedState } from 'reducers/interfaces';
import { getJobsAsync } from 'actions/jobs-actions';

import TopBarComponent from './top-bar';
import JobsContentComponent from './jobs-content';

function JobsPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const query = useSelector((state: CombinedState) => state.jobs.query);
    const fetching = useSelector((state: CombinedState) => state.jobs.fetching);
    const count = useSelector((state: CombinedState) => state.jobs.count);
    const history = useHistory();

    useEffect(() => {
        // get relevant query parameters from the url and fetch jobs according to them
        const { location } = history;
        const searchParams = new URLSearchParams(location.search);
        const copiedQuery = { ...query };
        for (const key of Object.keys(copiedQuery)) {
            if (searchParams.has(key)) {
                const value = searchParams.get(key);
                if (value) {
                    copiedQuery[key] = key === 'page' ? +value : value;
                }
            } else {
                copiedQuery[key] = null;
            }
        }

        dispatch(getJobsAsync(copiedQuery));
    }, []);

    useEffect(() => {
        // when query is updated, set relevant search params to url
        const searchParams = new URLSearchParams();
        const { location } = history;
        for (const [key, value] of Object.entries(query)) {
            if (value) {
                searchParams.set(key, value.toString());
            }
        }

        history.push(`${location.pathname}?${searchParams.toString()}`);
    }, [query]);

    if (fetching) {
        return (
            <div className='cvat-jobs-page'>
                <Spin size='large' className='cvat-spinner' />
            </div>
        );
    }

    const dimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    return (
        <div className='cvat-jobs-page'>
            <TopBarComponent
                query={query}
                onChangeFilters={(filters: Record<string, string | null>) => {
                    dispatch(
                        getJobsAsync({
                            ...query,
                            ...filters,
                            page: 1,
                        }),
                    );
                }}
            />
            {count ? (
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
            ) : <Empty />}

        </div>
    );
}

export default React.memo(JobsPageComponent);
