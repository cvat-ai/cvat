// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { getModelsAsync } from 'actions/models-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import Spin from 'antd/lib/spin';

import DeployedModelsList from './deployed-models-list';
import EmptyListComponent from './empty-list';
import FeedbackComponent from '../feedback/feedback';
import { CombinedState } from '../../reducers';
import TopBar from './top-bar';

function ModelsPageComponent(): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();
    const fetching = useSelector((state: CombinedState) => state.models.fetching);
    const query = useSelector((state: CombinedState) => state.models.query);
    const totalCount = useSelector((state: CombinedState) => state.models.totalCount);

    const onCreateModel = useCallback(() => {
        history.push('/models/create');
    }, []);

    const updatedQuery = { ...query };
    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

    useEffect(() => {
        dispatch(getModelsAsync());
    }, []);

    const content = totalCount ? (
        <DeployedModelsList />
    ) : <EmptyListComponent />;

    return (
        <div className='cvat-models-page'>
            <TopBar
                disabled
                query={updatedQuery}
                onCreateModel={onCreateModel}
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
            { fetching ? (
                <div className='cvat-empty-models-list'>
                    <Spin size='large' className='cvat-spinner' />
                </div>
            ) : content }
            <FeedbackComponent />
        </div>
    );
}

export default React.memo(ModelsPageComponent);
