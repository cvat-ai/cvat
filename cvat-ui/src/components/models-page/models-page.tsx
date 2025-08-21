// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
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
    externalModels.sort((a, b) => moment(a.createdDate).valueOf() - moment(b.createdDate).valueOf());
    const renderModels = [...builtInModels, ...externalModels];
    return renderModels.slice((newPage - 1) * pageSize, newPage * pageSize);
}

function ModelsPageComponent(): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();
    const fetching = useSelector((state: CombinedState) => state.models.fetching);
    const query = useSelector((state: CombinedState) => state.models.query);
    const bulkFetching = useSelector((state: CombinedState) => state.bulkActions.fetching);
    const interactors = useSelector((state: CombinedState) => state.models.interactors);
    const detectors = useSelector((state: CombinedState) => state.models.detectors);
    const trackers = useSelector((state: CombinedState) => state.models.trackers);
    const reid = useSelector((state: CombinedState) => state.models.reid);
    const totalCount = useSelector((state: CombinedState) => state.models.totalCount);

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

    const allModelIds = models.filter((m) => m.provider !== ModelProviders.CVAT).map((m) => m.id);
    const selectedCount = useSelector((state: CombinedState) => state.models.selected.length);
    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(allModelIds, SelectedResourceType.MODELS));
    }, [allModelIds]);

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
