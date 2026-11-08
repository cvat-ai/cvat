// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import _ from 'lodash';
import jsonLogic from 'json-logic-js';
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

function filterAndSortModels(models: MLModel[], query: ModelsQuery): MLModel[] {
    let result = models;

    if (query.search) {
        const searchLower = query.search.toLowerCase();
        result = result.filter((model: MLModel) => (
            model.name.toLowerCase().includes(searchLower) ||
            model.description?.toLowerCase().includes(searchLower) ||
            model.owner?.toLowerCase().includes(searchLower) ||
            String(model.id).includes(searchLower)
        ));
    }

    if (query.filter) {
        try {
            const filter = JSON.parse(query.filter);
            const converted = result.map((model: MLModel) => ({
                id: model.id,
                name: model.name,
                owner: model.owner,
                description: model.description,
                type: model.displayKind || model.kind,
                provider: model.provider,
                updated_date: model.updatedDate,
                created_date: model.createdDate,
            }));
            result = result.filter((item, index) => jsonLogic.apply(filter, converted[index]));
        } catch {
            // ignore filter parse errors
        }
    }

    if (query.sort) {
        let sort = query.sort.split(',');
        const orders: ('asc' | 'desc')[] = sort.map((elem: string) => (elem.startsWith('-') ? 'desc' : 'asc'));
        sort = sort.map((elem: string) => (elem.startsWith('-') ? elem.substring(1) : elem));

        const iteratees = sort.map((field: string) => {
            switch (field) {
                case 'id':
                    return (m: MLModel) => (typeof m.id === 'number' ? m.id : Number(m.id) || m.id);
                case 'name':
                    return (m: MLModel) => m.name.toLowerCase();
                case 'type':
                    return (m: MLModel) => (m.displayKind || m.kind || '').toLowerCase();
                case 'owner':
                    return (m: MLModel) => (m.owner || '').toLowerCase();
                case 'description':
                    return (m: MLModel) => (m.description || '').toLowerCase();
                case 'created_date':
                    return (m: MLModel) => (m.createdDate ? dayjs(m.createdDate).valueOf() : 0);
                case 'updated_date':
                    return (m: MLModel) => (m.updatedDate ? dayjs(m.updatedDate).valueOf() : 0);
                default:
                    return (m: MLModel) => (m as any)[field] ?? '';
            }
        });

        result = _.orderBy(result, iteratees, orders);
    } else {
        const builtInModels = result.filter((model: MLModel) => model.provider === ModelProviders.CVAT);
        const externalModels = result.filter((model: MLModel) => model.provider !== ModelProviders.CVAT);
        externalModels.sort((a, b) => dayjs(a.createdDate).valueOf() - dayjs(b.createdDate).valueOf());
        result = [...builtInModels, ...externalModels];
    }

    return result;
}

function setUpModelsList(models: MLModel[], newPage: number, pageSize: number): MLModel[] {
    return models.slice((newPage - 1) * pageSize, newPage * pageSize);
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
    const filteredModels = filterAndSortModels(allModels, updatedQuery);
    const totalCount = filteredModels.length;

    const { page, pageSize } = updatedQuery;
    const models = setUpModelsList(
        filteredModels,
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
