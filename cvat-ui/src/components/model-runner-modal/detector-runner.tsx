// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Button from 'antd/lib/button';
import Switch from 'antd/lib/switch';
import notification from 'antd/lib/notification';

import { StringObject } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import { clamp } from 'utils/math';
import {
    MLModel, ModelKind, ModelReturnType, DimensionType, Label as LabelInterface,
} from 'cvat-core-wrapper';

import LabelsMatcher, { Match } from './matcher';

interface Props {
    withCleanup: boolean;
    models: MLModel[];
    labels: LabelInterface[];
    dimension: DimensionType;
    runInference(model: MLModel, body: object): void;
}

type Mapping = Record<string, {
    name: string;
    attributes: { [index: string]: { name: string } };
    elements?: Mapping;
}>

interface MappedLabel {
    name: string;
    attributes: StringObject;
}

type MappedLabelsList = Record<string, MappedLabel>;

export interface DetectorRequestBody {
    mapping: MappedLabelsList;
    cleanup: boolean;
    convMaskToPoly: boolean;
}

function convertMappingToServer(mapping: Match): Mapping {
    return mapping.reduce<Mapping>((acc, [modelLabel, taskLabel, subMapping]) => (
        {
            ...acc,
            [modelLabel.name]: {
                name: taskLabel.name,
                attributes: {},
                ...(subMapping.length ? { elements: convertMappingToServer(subMapping) } : {}),
            },
        }
    ), {});
}

function DetectorRunner(props: Props): JSX.Element {
    const {
        models, withCleanup, labels, dimension, runInference,
    } = props;

    const [modelID, setModelID] = useState<string | null>(null);
    const [threshold, setThreshold] = useState<number>(0.5);
    const [distance, setDistance] = useState<number>(50);
    const [cleanup, setCleanup] = useState<boolean>(false);
    const [match, setMatch] = useState<Match>([]);
    const [convertMasksToPolygons, setConvertMasksToPolygons] = useState<boolean>(false);

    const model = models.filter((_model): boolean => _model.id === modelID)[0];
    const isDetector = model && model.kind === ModelKind.DETECTOR;
    const isReId = model && model.kind === ModelKind.REID;
    const isClassifier = model && model.kind === ModelKind.CLASSIFIER;
    const convertMasksToPolygonsAvailable = isDetector &&
        (!model.returnType || model.returnType === ModelReturnType.MASK);
    const buttonEnabled =
        model && (model.kind === ModelKind.REID ||
            (model.kind === ModelKind.DETECTOR && match.length) ||
            (model.kind === ModelKind.CLASSIFIER && match.length));
    const canHaveMapping = isDetector || isClassifier;

    if (model && model.kind === ModelKind.REID && !model.labels.length) {
        notification.warning({
            message: 'The selected model does not include any labels',
        });
    }

    return (
        <div className='cvat-run-model-content'>
            <Row align='middle'>
                <Col span={4}>Model:</Col>
                <Col span={20}>
                    <Select
                        placeholder={dimension === DimensionType.DIMENSION_2D ? 'Select a model' : 'No models available'}
                        disabled={dimension !== DimensionType.DIMENSION_2D}
                        style={{ width: '100%' }}
                        onChange={(_modelID: string): void => {
                            setModelID(_modelID);
                        }}
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
            {canHaveMapping ? (
                <>
                    <Row justify='start' align='middle'>
                        <LabelsMatcher
                            onUpdateMatch={(_match: Match) => setMatch(_match)}
                            modelLabels={model.labels}
                            taskLabels={labels.map((label) => ({
                                name: label.name,
                                type: label.type,
                                attributes: label.attributes.map((attr) => ({
                                    name: attr.name,
                                    input_type: attr.inputType,
                                    values: [...attr.values],
                                })),
                                elements: (label.structure?.sublabels || []).map((sublabel) => ({
                                    name: sublabel.name,
                                    type: sublabel.type,
                                    attributes: sublabel.attributes.map((attr) => ({
                                        name: attr.name,
                                        input_type: attr.inputType,
                                        values: [...attr.values],
                                    })),
                                })),
                            }))}
                        />
                    </Row>
                </>
            ) : null}
            {convertMasksToPolygonsAvailable && (
                <div className='detector-runner-convert-masks-to-polygons-wrapper'>
                    <Switch
                        checked={convertMasksToPolygons}
                        onChange={(checked: boolean) => {
                            setConvertMasksToPolygons(checked);
                        }}
                    />
                    <Text>Convert masks to polygons</Text>
                </div>
            )}
            {isDetector && withCleanup ? (
                <div className='detector-runner-clean-previous-annotations-wrapper'>
                    <Switch
                        checked={cleanup}
                        onChange={(checked: boolean): void => setCleanup(checked)}
                    />
                    <Text>Clean previous annotations</Text>
                </div>
            ) : null}
            {isReId ? (
                <div>
                    <Row align='middle' justify='start'>
                        <Col>
                            <Text>Threshold</Text>
                        </Col>
                        <Col offset={1}>
                            <CVATTooltip title='Minimum similarity value for shapes that can be merged'>
                                <InputNumber
                                    min={0.01}
                                    step={0.01}
                                    max={1}
                                    value={threshold}
                                    onChange={(value: number | undefined | string | null) => {
                                        if (typeof value !== 'undefined' && value !== null) {
                                            setThreshold(clamp(+value, 0.01, 1));
                                        }
                                    }}
                                />
                            </CVATTooltip>
                        </Col>
                    </Row>
                    <Row align='middle' justify='start'>
                        <Col>
                            <Text>Maximum distance</Text>
                        </Col>
                        <Col offset={1}>
                            <CVATTooltip title='Maximum distance between shapes that can be merged'>
                                <InputNumber
                                    placeholder='Threshold'
                                    min={1}
                                    value={distance}
                                    onChange={(value: number | undefined | string | null) => {
                                        if (typeof value !== 'undefined' && value !== null) {
                                            setDistance(+value);
                                        }
                                    }}
                                />
                            </CVATTooltip>
                        </Col>
                    </Row>
                </div>
            ) : null}
            <Row align='middle' justify='end'>
                <Col>
                    <Button
                        className='cvat-inference-run-button'
                        disabled={!buttonEnabled}
                        type='primary'
                        onClick={() => {
                            let requestBody: object = {};
                            if (model.kind === ModelKind.DETECTOR) {
                                requestBody = {
                                    mapping_v2: convertMappingToServer(match),
                                    mapping: Object.fromEntries(match.map(([modelLabel, taskLabel]) => (
                                        [modelLabel.name, {
                                            name: taskLabel.name,
                                            attributes: {},
                                        }]
                                    ))),
                                    cleanup,
                                    convMaskToPoly: convertMasksToPolygons,
                                };
                            } else if (model.kind === ModelKind.REID) {
                                requestBody = {
                                    threshold,
                                    max_distance: distance,
                                };
                            } else if (model.kind === ModelKind.CLASSIFIER) {
                                requestBody = {
                                    mapping_v2: convertMappingToServer(match),
                                    mapping: Object.fromEntries(match.map(([modelLabel, taskLabel]) => (
                                        [modelLabel.name, taskLabel.name]
                                    ))),
                                    attributes: {},
                                };
                            }

                            runInference(model, requestBody);
                        }}
                    >
                        Annotate
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(DetectorRunner);
