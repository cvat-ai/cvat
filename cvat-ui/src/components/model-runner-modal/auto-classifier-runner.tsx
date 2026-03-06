// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier = MIT

import './styles.scss';
import React, { useState } from 'react';
import { Col, Row } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import { DimensionType, MLModel, ModelKind } from 'cvat-core-wrapper';

interface Props {
    models: MLModel[];
    dimension: DimensionType;
    runInference(model: MLModel, body: object): void;
}

export interface AutoClassifierRequestBody {
    threshold: number;
}

function AutoClassifierRunner(props: Props): JSX.Element {
    const { models, dimension, runInference } = props;
    const [ modelID, setModelID ] = useState<string | null>(null);
    const [ threshold, setThreshold ] = useState<number>(0.5);  // Maybe support set threshold
    const model = models.find((_model): boolean => _model.id === modelID);
    const buttonEnabled = model && (model.kind === ModelKind.AUTOCLASSIFIER);

    return (
        <div className='cvat-run-model-content'>
            <Row align='middle'>
                <Col span={4}>Model:</Col>
                <Col span={20}>
                    <Select
                        style={{ width: '100%' }}
                        placeholder={dimension === DimensionType.DIMENSION_2D ? 'Select a model' : 'No models available'}
                        disabled={dimension !== DimensionType.DIMENSION_2D}
                        onChange={(_modelID: string): void => { setModelID(_modelID); }}
                    >
                        {models.map(
                            (_model: MLModel): JSX.Element => (
                                <Select.Option value={_model.id} key={_model.id}>
                                    {_model.name}
                                </Select.Option>
                            ),
                        )}
                    </Select>
                </Col>
            </Row>
            <Row align='middle' justify='end'>
                <Col>
                    <Button
                        className='cvat-inference-run-button'
                        disabled={!buttonEnabled}
                        type='primary'
                        onClick={() => {
                            if (!model) return;
                            if ( model.kind === ModelKind.AUTOCLASSIFIER ) {
                                runInference(model, { threshold } as AutoClassifierRequestBody);
                            }
                        }}
                    >
                        Auto select all label
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AutoClassifierRunner);
