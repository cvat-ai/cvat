// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import { getModelsAsync } from 'actions/models-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import Spin from 'antd/lib/spin';

import { CombinedState, ModelsQuery, SelectedResourceType } from 'reducers';
import { useResourceQuery } from 'utils/hooks';
import { selectionActions } from 'actions/selection-actions';
import { ModelProviders } from 'cvat-core-wrapper';
import DeployedModelsList from './deployed-models-list';
import EmptyListComponent from './empty-list';
import TopBar from './top-bar';
import { filterModels } from './model-list';

function ModelsPageComponent(): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();
    const {
        fetching,
        query,
        bulkFetching,
        interactors,
        detectors,
        trackers,
        reid,
        selectedCount,
    } = useSelector((state: CombinedState) => ({
        fetching: state.models.fetching,
        query: state.models.query,
        bulkFetching: state.bulkActions.fetching,
        interactors: state.models.interactors,
        detectors: state.models.detectors,
        trackers: state.models.trackers,
        reid: state.models.reid,
        selectedCount: state.models.selected.length,
    }), shallowEqual);

    const updatedQuery = useResourceQuery<ModelsQuery>(query, { pageSize: 12 });

    const allModels = [...interactors, ...detectors, ...trackers, ...reid];
    const filteredModels = filterModels(allModels, updatedQuery);
    const models = filteredModels.slice(
        (updatedQuery.page - 1) * updatedQuery.pageSize,
        updatedQuery.page * updatedQuery.pageSize,
    );

    const setQuery = useCallback((nextQuery: ModelsQuery): void => {
        const search = updateHistoryFromQuery(nextQuery);
        if (search !== history.location.search) {
            history.push({ ...history.location, search });
        }
    }, [history]);

    useEffect(() => {
        dispatch(getModelsAsync());
    }, []);

    useEffect(() => {
        const pages = Math.ceil(filteredModels.length / updatedQuery.pageSize);
        if (!fetching && pages && updatedQuery.page > pages) {
            setQuery({ ...updatedQuery, page: 1 });
        }
    }, [fetching, filteredModels.length, updatedQuery.page, updatedQuery.pageSize]);

    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(
            models.filter((model) => model.provider !== ModelProviders.CVAT).map((model) => model.id),
            SelectedResourceType.MODELS,
        ));
    }, [models]);

    const content = filteredModels.length ? (
        <DeployedModelsList
            query={updatedQuery}
            models={models}
            totalCount={filteredModels.length}
            onChangePage={(page: number, pageSize: number) => setQuery({
                ...updatedQuery,
                page,
                pageSize,
            })}
        />
    ) : <EmptyListComponent notFound={allModels.length > 0} />;

    return (
        <div className='cvat-models-page'>
            <TopBar
                query={updatedQuery}
                selectedCount={selectedCount}
                onSelectAll={onSelectAll}
                onApplySearch={(search: string | null) => {
                    setQuery({
                        ...updatedQuery,
                        search: search?.trim() || null,
                        page: 1,
                    });
                }}
                onApplyFilter={(filter: string | null) => {
                    setQuery({
                        ...updatedQuery,
                        filter,
                        page: 1,
                    });
                }}
                onApplySorting={(sorting: string | null) => {
                    setQuery({
                        ...updatedQuery,
                        sort: sorting,
                        page: 1,
                    });
                }}
            />
            { fetching && !bulkFetching ? (
                <div className='cvat-empty-models-list'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
        </div>
    );
}

export default React.memo(ModelsPageComponent);
