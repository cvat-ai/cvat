// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';
import { CombinedState } from 'reducers';
import { MLModel } from 'cvat-core-wrapper';
import { ModelProviders } from 'cvat-core/src/enums';
import DeployedModelItem from './deployed-model-item';

const PAGE_SIZE = 12;

function setUpModelsList(models: MLModel[], newPage: number): MLModel[] {
    const builtInModels = models.filter((model: MLModel) => model.provider === ModelProviders.CVAT);
    const externalModels = models.filter((model: MLModel) => model.provider !== ModelProviders.CVAT);
    externalModels.sort((a, b) => moment(a.createdDate).valueOf() - moment(b.createdDate).valueOf());
    const renderModels = [...builtInModels, ...externalModels];
    return renderModels.slice((newPage - 1) * PAGE_SIZE, newPage * PAGE_SIZE);
}

export default function DeployedModelsListComponent(): JSX.Element {
    const interactors = useSelector((state: CombinedState) => state.models.interactors);
    const detectors = useSelector((state: CombinedState) => state.models.detectors);
    const trackers = useSelector((state: CombinedState) => state.models.trackers);
    const reid = useSelector((state: CombinedState) => state.models.reid);
    const classifiers = useSelector((state: CombinedState) => state.models.classifiers);
    const totalCount = useSelector((state: CombinedState) => state.models.totalCount);
    const [page, setPage] = useState(1);
    const models = [...interactors, ...detectors, ...trackers, ...reid, ...classifiers];
    const items = setUpModelsList(models, page)
        .map((model): JSX.Element => <DeployedModelItem key={model.id} model={model} />);

    return (
        <>
            <Row justify='center' align='top'>
                <Col md={22} lg={18} xl={16} xxl={16} className='cvat-models-list'>
                    {items}
                </Col>
            </Row>
            <Row justify='center' align='middle'>
                <Pagination
                    className='cvat-tasks-pagination'
                    onChange={(newPage: number) => {
                        setPage(newPage);
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
