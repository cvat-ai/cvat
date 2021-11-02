// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';

import { CloudStoragesQuery, CombinedState } from 'reducers/interfaces';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import CloudStoragesListComponent from './cloud-storages-list';
import EmptyCloudStorageListComponent from './empty-cloud-storages-list';
import TopBarComponent from './top-bar';

export default function StoragesPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const { search } = history.location;
    const totalCount = useSelector((state: CombinedState) => state.cloudStorages.count);
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.fetching);
    const current = useSelector((state: CombinedState) => state.cloudStorages.current);
    const query = useSelector((state: CombinedState) => state.cloudStorages.gettingQuery);
    const onSearch = useCallback(
        (_query: CloudStoragesQuery) => {
            if (!isFetching) dispatch(getCloudStoragesAsync(_query));
        },
        [isFetching],
    );

    const onChangePage = useCallback(
        (page: number) => {
            if (!isFetching && page !== query.page) dispatch(getCloudStoragesAsync({ ...query, page }));
        },
        [query],
    );

    const dimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    useEffect(() => {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value !== null && typeof value !== 'undefined') {
                searchParams.append(key, value.toString());
            }
        }

        history.push({
            pathname: '/cloudstorages',
            search: `?${searchParams.toString()}`,
        });
    }, [query]);

    useEffect(() => {
        const searchParams = { ...query };
        for (const [key, value] of new URLSearchParams(search)) {
            if (key in searchParams) {
                searchParams[key] = ['page', 'id'].includes(key) ? +value : value;
            }
        }
        onSearch(searchParams);
    }, []);

    const searchWasUsed = Object.entries(query).some(([key, value]) => {
        if (key === 'page') {
            return value && Number.isInteger(value) && value > 1;
        }

        return !!value;
    });

    if (isFetching) {
        return (
            <Row className='cvat-cloud-storages-page' justify='center' align='middle'>
                <Spin size='large' />
            </Row>
        );
    }

    return (
        <Row className='cvat-cloud-storages-page' justify='center' align='top'>
            <Col {...dimensions}>
                <TopBarComponent query={query} onSearch={onSearch} />
                {current.length ? (
                    <CloudStoragesListComponent
                        totalCount={totalCount}
                        page={query.page}
                        storages={current}
                        onChangePage={onChangePage}
                    />
                ) : (
                    <EmptyCloudStorageListComponent notFound={searchWasUsed} />
                )}
            </Col>
        </Row>
    );
}
