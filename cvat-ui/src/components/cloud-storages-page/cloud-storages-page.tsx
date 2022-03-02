// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers/interfaces';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import CloudStoragesListComponent from './cloud-storages-list';
import EmptyCloudStorageListComponent from './empty-cloud-storages-list';
import TopBarComponent from './top-bar';

export default function StoragesPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const totalCount = useSelector((state: CombinedState) => state.cloudStorages.count);
    const fetching = useSelector((state: CombinedState) => state.cloudStorages.fetching);
    const current = useSelector((state: CombinedState) => state.cloudStorages.current);
    const query = useSelector((state: CombinedState) => state.cloudStorages.gettingQuery);
    const anySearch = Object.keys(query).some((value: string) => value !== 'page' && (query as any)[value] !== null);

    const onChangePage = useCallback(
        (page: number) => {
            if (!fetching && page !== query.page) dispatch(getCloudStoragesAsync({ ...query, page }));
        },
        [query],
    );

    const dimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    const content = current.length ? (
        <CloudStoragesListComponent
            totalCount={totalCount}
            page={query.page}
            storages={current}
            onChangePage={onChangePage}
        />
    ) : (
        <EmptyCloudStorageListComponent notFound={anySearch} />
    );

    return (
        <Row className='cvat-cloud-storages-page' justify='center' align='top'>
            <Col {...dimensions}>
                <TopBarComponent
                    onApplySearch={(_search: string | null) => {
                        dispatch(
                            getCloudStoragesAsync({
                                ...query,
                                search: _search,
                                page: 1,
                            }),
                        );
                    }}
                    onApplyFilter={(filter: string | null) => {
                        dispatch(
                            getCloudStoragesAsync({
                                ...query,
                                filter,
                                page: 1,
                            }),
                        );
                    }}
                    onApplySorting={(sorting: string | null) => {
                        dispatch(
                            getCloudStoragesAsync({
                                ...query,
                                sort: sorting,
                                page: 1,
                            }),
                        );
                    }}
                    query={query}
                />
                { fetching ? (
                    <Row className='cvat-cloud-storages-page' justify='center' align='middle'>
                        <Spin size='large' />
                    </Row>
                ) : content }
            </Col>
        </Row>
    );
}
