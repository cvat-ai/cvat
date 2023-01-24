// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
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
                <Col md={22} lg={18} xl={16} xxl={14} className='cvat-models-list'>
                    <Row align='middle' className='cvat-models-heading'>
                        <Col span={2}>
                            <Text strong>Provider</Text>
                        </Col>
                        <Col span={3}>
                            <Text strong>Name</Text>
                        </Col>
                        <Col span={2} offset={1}>
                            <Text strong>Owner</Text>
                        </Col>
                        <Col span={3}>
                            <Text strong>Type</Text>
                        </Col>
                        <Col span={8}>
                            <Text strong>Description</Text>
                        </Col>
                        <Col span={5}>
                            <Text strong>Labels</Text>
                        </Col>
                    </Row>
                    {items}
                </Col>
            </Row>
        </>
    );
}
