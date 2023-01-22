// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { getModelsAsync } from 'actions/models-actions';
import { updateHistoryFromQuery } from 'components/resource-sorting-filtering';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';
import Spin from 'antd/lib/spin';
import { MLModel } from 'cvat-core-wrapper';

import DeployedModelsList from './deployed-models-list';
import EmptyListComponent from './empty-list';
import FeedbackComponent from '../feedback/feedback';
import { CombinedState } from '../../reducers';
import TopBar from './top-bar';

interface Props {
    interactors: MLModel[];
    detectors: MLModel[];
    trackers: MLModel[];
    reid: MLModel[];
}
const PAGE_SIZE = 10;

export default function ModelsPageComponent(props: Props): JSX.Element {
    const {
        interactors, detectors, trackers, reid,
    } = props;
    const history = useHistory();
    const dispatch = useDispatch();
    const fetching = useSelector((state: CombinedState) => state.models.fetching);
    const query = useSelector((state: CombinedState) => state.models.query);

    const onCreateModel = useCallback(() => {
        history.push('/models/create');
    }, []);

    const updatedQuery = { ...query };
    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

    const deployedModels = [...detectors, ...interactors, ...trackers, ...reid];

    const content = deployedModels.length ? (
        <>
            <DeployedModelsList models={deployedModels} />
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-tasks-pagination'
                        onChange={(page: number) => {
                            dispatch(getModelsAsync({
                                ...query,
                                page,
                            }));
                        }}
                        showSizeChanger={false}
                        total={deployedModels.length}
                        current={query.page}
                        pageSize={PAGE_SIZE}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    ) : <EmptyListComponent />;

    return (
        <div className='cvat-models-page'>
            <TopBar
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
