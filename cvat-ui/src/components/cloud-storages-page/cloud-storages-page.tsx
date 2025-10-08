// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Row } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';

import { CloudStoragesQuery, CombinedState, SelectedResourceType } from 'reducers';
import { getCloudStoragesAsync } from 'actions/cloud-storage-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { anySearch } from 'utils/any-search';
import { useResourceQuery } from 'utils/hooks';
import { selectionActions } from 'actions/selection-actions';
import CloudStoragesListComponent from './cloud-storages-list';
import EmptyListComponent from './empty-list';
import TopBarComponent from './top-bar';

export default function StoragesPageComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isMounted, setIsMounted] = useState(false);
    const {
        totalCount,
        fetching,
        current,
        query,
        bulkFetching,
        selectedCount,
    } = useSelector((state: CombinedState) => ({
        totalCount: state.cloudStorages.count,
        fetching: state.cloudStorages.fetching,
        current: state.cloudStorages.current,
        query: state.cloudStorages.gettingQuery,
        bulkFetching: state.bulkActions.fetching,
        selectedCount: state.cloudStorages.selected.length,
    }), shallowEqual);

    const updatedQuery = useResourceQuery<CloudStoragesQuery>(query, { pageSize: 12 });

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
        (page: number, pageSize: number) => {
            if (!fetching) {
                dispatch(getCloudStoragesAsync({ ...query, page, pageSize }));
            }
        },
        [query],
    );

    const onSelectAll = useCallback(() => {
        dispatch(
            selectionActions.selectResources(current.map((s) => s.id),
                SelectedResourceType.CLOUD_STORAGES,
            ));
    }, [current]);

    const isAnySearch = anySearch<CloudStoragesQuery>(query);

    const content = current.length ? (
        <CloudStoragesListComponent
            totalCount={totalCount}
            page={query.page}
            pageSize={query.pageSize}
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
                selectedCount={selectedCount}
                onSelectAll={onSelectAll}
            />
            { fetching && !bulkFetching ? (
                <Row className='cvat-cloud-storages-page' justify='center' align='middle'>
                    <Spin size='large' />
                </Row>
            ) : content }
        </div>
    );
}
