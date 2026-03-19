// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { getModelsAsync } from 'actions/models-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import Spin from 'antd/lib/spin';
import notification from 'antd/lib/notification';

import { CombinedState, ModelsQuery, SelectedResourceType } from 'reducers';
import { useResourceQuery } from 'utils/hooks';
import { selectionActions } from 'actions/selection-actions';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import DeployedModelsList from './deployed-models-list';
import EmptyListComponent from './empty-list';
import TopBar from './top-bar';

function setUpModelsList(models: MLModel[], newPage: number, pageSize: number): MLModel[] {
    const builtInModels = models.filter((model: MLModel) => model.provider === ModelProviders.CVAT);
    const externalModels = models.filter((model: MLModel) => model.provider !== ModelProviders.CVAT);
    externalModels.sort((a, b) => dayjs(a.createdDate).valueOf() - dayjs(b.createdDate).valueOf());
    const renderModels = [...builtInModels, ...externalModels];
    return renderModels.slice((newPage - 1) * pageSize, newPage * pageSize);
}

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
        totalCount,
        selectedCount,
    } = useSelector((state: CombinedState) => ({
        fetching: state.models.fetching,
        query: state.models.query,
        bulkFetching: state.bulkActions.fetching,
        interactors: state.models.interactors,
        detectors: state.models.detectors,
        trackers: state.models.trackers,
        reid: state.models.reid,
        totalCount: state.models.totalCount,
        selectedCount: state.models.selected.length,
    }), shallowEqual);

    const updatedQuery = useResourceQuery<ModelsQuery>(query, { pageSize: 12 });

    const { page, pageSize } = updatedQuery;
    const models = setUpModelsList(
        [...interactors, ...detectors, ...trackers, ...reid],
        page,
        pageSize,
    );

    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

    const pageOutOfBounds = totalCount && updatedQuery.page > Math.ceil(totalCount / query.pageSize);
    useEffect(() => {
        dispatch(getModelsAsync(updatedQuery));
        if (pageOutOfBounds) {
            notification.error({
                message: 'Could not fetch models',
                description: 'Invalid page',
            });
        }
    }, []);

    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(
            models.filter((m) => m.provider !== ModelProviders.CVAT).map((m) => m.id),
            SelectedResourceType.MODELS,
        ));
    }, [models]);

    const content = (totalCount && !pageOutOfBounds) ? (
        <DeployedModelsList query={updatedQuery} models={models} totalCount={totalCount} />
    ) : <EmptyListComponent />;

    return (
        <div className='cvat-models-page'>
            <TopBar
                disabled
                query={updatedQuery}
                selectedCount={selectedCount}
                onSelectAll={onSelectAll}
                onApplySearch={(search: string | null) => {
                    dispatch(
                        getModelsAsync({
                            ...query,
                            search,
                            page: 1,
                        }),
                    );
                }}
                onApplyFilter={(filter: string | null) => {
                    dispatch(
                        getModelsAsync({
                            ...query,
                            filter,
                            page: 1,
                        }),
                    );
                }}
                onApplySorting={(sorting: string | null) => {
                    dispatch(
                        getModelsAsync({
                            ...query,
                            sort: sorting,
                            page: 1,
                        }),
                    );
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
