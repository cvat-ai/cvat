// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Row } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';

import { CloudStoragesQuery, CombinedState, Indexable } from 'reducers';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { anySearch } from 'utils/any-search';
import CloudStoragesListComponent from './cloud-storages-list';
import EmptyListComponent from './empty-list';
import TopBarComponent from './top-bar';

export default function StoragesPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isMounted, setIsMounted] = useState(false);
    const totalCount = useSelector((state: CombinedState) => state.cloudStorages.count);
    const fetching = useSelector((state: CombinedState) => state.cloudStorages.fetching);
    const current = useSelector((state: CombinedState) => state.cloudStorages.current);
    const query = useSelector((state: CombinedState) => state.cloudStorages.gettingQuery);

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }

    useEffect(() => {
        dispatch(getCloudStoragesAsync({ ...updatedQuery }));
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            // do not update URL from previous query which might exist if we left page of SPA before and returned here
            history.replace({
                search: updateHistoryFromQuery(query),
            });
        }
    }, [query]);

    const onChangePage = useCallback(
        (page: number) => {
            if (!fetching && page !== query.page) {
                dispatch(getCloudStoragesAsync({ ...query, page }));
            }
        },
        [query],
    );

    const isAnySearch = anySearch<CloudStoragesQuery>(query);

    const content = current.length ? (
        <CloudStoragesListComponent
            totalCount={totalCount}
            page={query.page}
            storages={current}
            onChangePage={onChangePage}
        />
    ) : (
        <EmptyListComponent notFound={isAnySearch} />
    );

    return (
        <div className='cvat-cloud-storages-page'>
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
                query={updatedQuery}
            />
            { fetching ? (
                <Row className='cvat-cloud-storages-page' justify='center' align='middle'>
                    <Spin size='large' />
                </Row>
            ) : content }
        </div>
    );
}
