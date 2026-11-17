// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import dimensions from 'utils/dimensions';
import BulkWrapper from 'components/bulk-wrapper';
import { ModelsQuery, SelectedResourceType } from 'reducers';

import DeployedModelItem from './deployed-model-item';

interface Props {
    query: ModelsQuery;
    models: MLModel[];
    totalCount: number;
    onChangePage: (page: number, pageSize: number) => void;
}

export default function DeployedModelsListComponent(props: Readonly<Props>): JSX.Element {
    const {
        query, models, totalCount, onChangePage,
    } = props;
    const { page, pageSize } = query;

    const selectableModels = models.filter((model) => model.provider !== ModelProviders.CVAT);
    const modelIdToIndex = new Map<string | number, number>();
    selectableModels.forEach((model, index) => modelIdToIndex.set(model.id, index));
    const groupedModels = models.reduce<MLModel[][]>((groups, model, index) => {
        if (index % 4) {
            groups[groups.length - 1].push(model);
        } else {
            groups.push([model]);
        }
        return groups;
    }, []);

    return (
        <>
            <Row justify='center' align='top' className='cvat-resource-list-wrapper'>
                <Col {...dimensions} className='cvat-models-list cvat-resource-card-list'>
                    <BulkWrapper
                        currentResourceIds={selectableModels.map((model) => model.id)}
                        resourceType={SelectedResourceType.MODELS}
                    >
                        {(selectProps) => groupedModels.map((modelInstances) => (
                            <Row
                                key={modelInstances[0].id}
                                className='cvat-models-list-row cvat-resource-card-list-row'
                            >
                                {modelInstances.map((model: MLModel) => {
                                    const globalIdx = modelIdToIndex.get(model.id) ?? 0;
                                    return (
                                        <Col
                                            span={6}
                                            key={model.id}
                                            className='cvat-models-list-column cvat-resource-card-list-column'
                                        >
                                            <DeployedModelItem
                                                model={model}
                                                {...selectProps(model.id, globalIdx)}
                                            />
                                        </Col>
                                    );
                                })}
                            </Row>
                        ))}
                    </BulkWrapper>
                </Col>
            </Row>
            <Row justify='center' align='middle' className='cvat-resource-pagination-wrapper'>
                <Pagination
                    className='cvat-models-pagination'
                    onChange={onChangePage}
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
