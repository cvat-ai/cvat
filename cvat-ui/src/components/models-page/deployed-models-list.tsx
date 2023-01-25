// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
import DeployedModelItem from './deployed-model-item';

export default function DeployedModelsListComponent(): JSX.Element {
    const interactors = useSelector((state: CombinedState) => state.models.interactors);
    const detectors = useSelector((state: CombinedState) => state.models.detectors);
    const trackers = useSelector((state: CombinedState) => state.models.trackers);
    const reid = useSelector((state: CombinedState) => state.models.reid);
    const classifiers = useSelector((state: CombinedState) => state.models.classifiers);
    const models = [...interactors, ...detectors, ...trackers, ...reid, ...classifiers];

    const items = models.map((model): JSX.Element => <DeployedModelItem key={model.id} model={model} />);

    return (
        <>
            <Row justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={16} className='cvat-models-list'>
                    {items}
                </Col>
            </Row>
        </>
    );
}
