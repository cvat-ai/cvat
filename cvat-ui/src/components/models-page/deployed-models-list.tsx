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
import BulkWrapper from 'components/tasks-page/bulk-wrapper';
import DeployedModelItem from './deployed-model-item';

interface Props {
    query: ModelsQuery;
}

function setUpModelsList(models: MLModel[], newPage: number, pageSize: number): MLModel[] {
    const builtInModels = models.filter((model: MLModel) => model.provider === ModelProviders.CVAT);
    const externalModels = models.filter((model: MLModel) => model.provider !== ModelProviders.CVAT);
    externalModels.sort((a, b) => moment(a.createdDate).valueOf() - moment(b.createdDate).valueOf());
    const renderModels = [...builtInModels, ...externalModels];
    return renderModels.slice((newPage - 1) * pageSize, newPage * pageSize);
}

export default function DeployedModelsListComponent(props: Readonly<Props>): JSX.Element {
    const interactors = useSelector((state: CombinedState) => state.models.interactors);
    const detectors = useSelector((state: CombinedState) => state.models.detectors);
    const trackers = useSelector((state: CombinedState) => state.models.trackers);
    const reid = useSelector((state: CombinedState) => state.models.reid);
    const totalCount = useSelector((state: CombinedState) => state.models.totalCount);

    const dispatch = useDispatch();
    const { query } = props;
    const { page, pageSize } = query;
    const models = setUpModelsList(
        [...interactors, ...detectors, ...trackers, ...reid],
        page,
        pageSize,
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

    const modelIdToIndex = new Map<number, number>();
    models.forEach((m, idx) => modelIdToIndex.set(Number(m.id), idx));

    return (
        <>
            <Row justify='center' align='top' className='cvat-resource-list-wrapper'>
                <Col {...dimensions} className='cvat-models-list'>
                    <BulkWrapper currentResourceIDs={models.map((m) => Number(m.id))}>
                        {(selectProps) => {
                            const renderModelRow = (instances: MLModel[]): JSX.Element => (
                                <Row key={instances[0].id} className='cvat-projects-list-row'>
                                    {instances.map((model: MLModel) => {
                                        const globalIdx = modelIdToIndex.get(Number(model.id)) ?? 0;
                                        return (
                                            <Col span={6} key={model.id}>
                                                <DeployedModelItem
                                                    model={model}
                                                    {...selectProps(Number(model.id), globalIdx)}
                                                />
                                            </Col>
                                        );
                                    })}
                                </Row>
                            );
                            return groupedModels.map(renderModelRow);
                        }}
                    </BulkWrapper>
                </Col>
            </Row>
            <Row justify='center' align='middle' className='cvat-resource-pagination-wrapper'>
                <Pagination
                    className='cvat-models-pagination'
                    onChange={(newPage: number, newPageSize: number) => {
                        dispatch(getModelsAsync({
                            ...query,
                            page: newPage,
                            pageSize: newPageSize,
                        }));
                    }}
                    total={totalCount}
                    current={page}
                    pageSize={pageSize}
                    pageSizeOptions={[12, 24, 48, 96]}
                    showQuickJumper
                    showSizeChanger
                />
            </Row>
        </>
    );
}
