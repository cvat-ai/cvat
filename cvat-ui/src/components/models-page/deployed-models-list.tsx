// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';
import { CombinedState, ModelsQuery } from 'reducers';
import { MLModel } from 'cvat-core-wrapper';
import { ModelProviders } from 'cvat-core/src/enums';
import { getModelsAsync } from 'actions/models-actions';
import dimensions from 'utils/dimensions';
import DeployedModelItem from './deployed-model-item';

export const PAGE_SIZE = 12;

interface Props {
    query: ModelsQuery;
}

function setUpModelsList(models: MLModel[], newPage: number): MLModel[] {
    const builtInModels = models.filter((model: MLModel) => model.provider === ModelProviders.CVAT);
    const externalModels = models.filter((model: MLModel) => model.provider !== ModelProviders.CVAT);
    externalModels.sort((a, b) => moment(a.createdDate).valueOf() - moment(b.createdDate).valueOf());
    const renderModels = [...builtInModels, ...externalModels];
    return renderModels.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
}

export default function DeployedModelsListComponent(props: Props): JSX.Element {
    const interactors = useSelector((state: CombinedState) => state.models.interactors);
    const detectors = useSelector((state: CombinedState) => state.models.detectors);
    const trackers = useSelector((state: CombinedState) => state.models.trackers);
    const reid = useSelector((state: CombinedState) => state.models.reid);
    const totalCount = useSelector((state: CombinedState) => state.models.totalCount);

    const dispatch = useDispatch();
    const { query } = props;
    const { page } = query;
    const models = setUpModelsList(
        [...interactors, ...detectors, ...trackers, ...reid],
        page,
    );

    const groupedModels = models.reduce(
        (acc: MLModel[][], storage: MLModel, index: number): MLModel[][] => {
            if (index && index % 4) {
                acc[acc.length - 1].push(storage);
            } else {
                acc.push([storage]);
            }
            return acc;
        },
        [],
    );

    return (
        <>
            <Row justify='center' align='top'>
                <Col {...dimensions} className='cvat-models-list'>
                    {groupedModels.map(
                        (instances: MLModel[]): JSX.Element => (
                            <Row key={instances[0].id}>
                                {instances.map((model: MLModel) => (
                                    <Col span={6} key={model.id}>
                                        <DeployedModelItem model={model} />
                                    </Col>
                                ))}
                            </Row>
                        ),
                    )}
                </Col>
            </Row>
            <Row justify='center' align='middle'>
                <Pagination
                    className='cvat-tasks-pagination'
                    onChange={(newPage: number) => {
                        dispatch(getModelsAsync({
                            ...query,
                            page: newPage,
                        }));
                    }}
                    showSizeChanger={false}
                    total={totalCount}
                    current={page}
                    pageSize={PAGE_SIZE}
                    showQuickJumper
                />
            </Row>
        </>
    );
}
