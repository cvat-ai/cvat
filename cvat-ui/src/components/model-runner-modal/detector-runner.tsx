// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Select, { BaseOptionType } from 'antd/lib/select';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';

import { Model, ModelAttribute, StringObject } from 'reducers';

import CVATTooltip from 'components/common/cvat-tooltip';
import { Label as LabelInterface } from 'components/labels-editor/common';
import { clamp } from 'utils/math';
import consts from 'consts';
import { DimensionType } from '../../reducers';

interface Props {
    withCleanup: boolean;
    models: Model[];
    labels: LabelInterface[];
    dimension: DimensionType;
    runInference(model: Model, body: object): void;
}

interface MappedLabel {
    name: string;
    attributes: StringObject;
}

type MappedLabelsList = Record<string, MappedLabel>;

export interface DetectorRequestBody {
    mapping: MappedLabelsList;
    cleanup: boolean;
}

interface Match {
    model: string | null;
    task: string | null;
}

function DetectorRunner(props: Props): JSX.Element {
    const {
        models, withCleanup, labels, dimension, runInference,
    } = props;

    const [modelID, setModelID] = useState<string | null>(null);
    const [mapping, setMapping] = useState<MappedLabelsList>({});
    const [threshold, setThreshold] = useState<number>(0.5);
    const [distance, setDistance] = useState<number>(50);
    const [cleanup, setCleanup] = useState<boolean>(false);
    const [match, setMatch] = useState<Match>({ model: null, task: null });
    const [attrMatches, setAttrMatch] = useState<Record<string, Match>>({});

    const model = models.filter((_model): boolean => _model.id === modelID)[0];
    const isDetector = model && model.type === 'detector';
    const isReId = model && model.type === 'reid';
    const buttonEnabled =
        model && (model.type === 'reid' || (model.type === 'detector' && !!Object.keys(mapping).length));

    const modelLabels = (isDetector ? model.labels : []).filter((_label: string): boolean => !(_label in mapping));
    const taskLabels = isDetector ? labels.map((label: any): string => label.name) : [];

    if (model && model.type !== 'reid' && !model.labels.length) {
        notification.warning({
            message: 'The selected model does not include any labels',
        });
    }

    function matchAttributes(
        labelAttributes: LabelInterface['attributes'],
        modelAttributes: ModelAttribute[],
    ): StringObject {
        if (Array.isArray(labelAttributes) && Array.isArray(modelAttributes)) {
            return labelAttributes
                .reduce((attrAcc: StringObject, attr: any): StringObject => {
                    if (modelAttributes.some((mAttr) => mAttr.name === attr.name)) {
                        attrAcc[attr.name] = attr.name;
                    }

                    return attrAcc;
                }, {});
        }

        return {};
    }

    function updateMatch(modelLabel: string | null, taskLabel: string | null): void {
        function addMatch(modelLbl: string, taskLbl: string): void {
            const newMatch: MappedLabelsList = {};
            const label = labels.find((l) => l.name === taskLbl) as LabelInterface;
            const currentModel = models.filter((_model): boolean => _model.id === modelID)[0];
            const attributes = matchAttributes(label.attributes, currentModel.attributes[modelLbl]);

            newMatch[modelLbl] = { name: taskLbl, attributes };
            setMapping({ ...mapping, ...newMatch });
            setMatch({ model: null, task: null });
        }

        if (match.model && taskLabel) {
            addMatch(match.model, taskLabel);
            return;
        }

        if (match.task && modelLabel) {
            addMatch(modelLabel, match.task);
            return;
        }

        setMatch({
            model: modelLabel,
            task: taskLabel,
        });
    }

    function updateAttrMatch(modelLabel: string, modelAttrLabel: string | null, taskAttrLabel: string | null): void {
        function addAttributeMatch(modelAttr: string, attrLabel: string): void {
            const newMatch: StringObject = {};
            newMatch[modelAttr] = attrLabel;
            mapping[modelLabel].attributes = { ...mapping[modelLabel].attributes, ...newMatch };

            delete attrMatches[modelLabel];
            setAttrMatch({ ...attrMatches });
        }

        const modelAttr = attrMatches[modelLabel]?.model;
        if (modelAttr && taskAttrLabel) {
            addAttributeMatch(modelAttr, taskAttrLabel);
            return;
        }

        const taskAttrModel = attrMatches[modelLabel]?.task;
        if (taskAttrModel && modelAttrLabel) {
            addAttributeMatch(modelAttrLabel, taskAttrModel);
            return;
        }

        attrMatches[modelLabel] = {
            model: modelAttrLabel,
            task: taskAttrLabel,
        };
        setAttrMatch({ ...attrMatches });
    }

    function renderMappingRow(
        color: string,
        leftLabel: string,
        rightLabel: string,
        removalTitle: string,
        onClick: () => void,
        className = '',
    ): JSX.Element {
        return (
            <Row key={leftLabel} justify='start' align='middle'>
                <Col span={10} className={className}>
                    <Tag color={color}>{leftLabel}</Tag>
                </Col>
                <Col span={10} offset={1} className={className}>
                    <Tag color={color}>{rightLabel}</Tag>
                </Col>
                <Col offset={1}>
                    <CVATTooltip title={removalTitle}>
                        <DeleteOutlined
                            className='cvat-danger-circle-icon'
                            onClick={onClick}
                        />
                    </CVATTooltip>
                </Col>
            </Row>
        );
    }

    function renderSelector(
        value: string,
        tooltip: string,
        labelsToRender: string[],
        onChange: (label: string) => void,
        className = '',
    ): JSX.Element {
        return (
            <CVATTooltip title={tooltip} className={className}>
                <Select
                    value={value}
                    onChange={onChange}
                    style={{ width: '100%' }}
                    showSearch
                    filterOption={(input: string, option: BaseOptionType | undefined) => {
                        if (option) {
                            const { children } = option.props;
                            if (typeof children === 'string') {
                                return children.toLowerCase().includes(input.toLowerCase());
                            }
                        }

                        return false;
                    }}
                >
                    {labelsToRender.map(
                        (label: string): JSX.Element => (
                            <Select.Option value={label} key={label}>
                                {label}
                            </Select.Option>
                        ),
                    )}
                </Select>
            </CVATTooltip>
        );
    }

    return (
        <div className='cvat-run-model-content'>
            <Row align='middle'>
                <Col span={4}>Model:</Col>
                <Col span={20}>
                    <Select
                        placeholder={dimension === DimensionType.DIM_2D ? 'Select a model' : 'No models available'}
                        disabled={dimension !== DimensionType.DIM_2D}
                        style={{ width: '100%' }}
                        onChange={(_modelID: string): void => {
                            const chosenModel = models.filter((_model): boolean => _model.id === _modelID)[0];
                            const defaultMapping = labels.reduce(
                                (acc: MappedLabelsList, label: LabelInterface): MappedLabelsList => {
                                    if (chosenModel.labels.includes(label.name)) {
                                        acc[label.name] = {
                                            name: label.name,
                                            attributes: matchAttributes(
                                                label.attributes, chosenModel.attributes[label.name],
                                            ),
                                        };
                                    }
                                    return acc;
                                }, {},
                            );

                            setMapping(defaultMapping);
                            setMatch({ model: null, task: null });
                            setAttrMatch({});
                            setModelID(_modelID);
                        }}
                    >
                        {models.map(
                            (_model: Model): JSX.Element => (
                                <Select.Option value={_model.id} key={_model.id}>
                                    {_model.name}
                                </Select.Option>
                            ),
                        )}
                    </Select>
                </Col>
            </Row>
            {isDetector &&
                Object.keys(mapping).length ?
                Object.keys(mapping).map((modelLabel: string) => {
                    const label = labels
                        .find((_label: LabelInterface): boolean => (
                            _label.name === mapping[modelLabel].name)) as LabelInterface;

                    const color = label ? label.color : consts.NEW_LABEL_COLOR;
                    const notMatchedModelAttributes = model.attributes[modelLabel]
                        .filter((_attribute: ModelAttribute): boolean => (
                            !(_attribute.name in (mapping[modelLabel].attributes || {}))
                        ));
                    const taskAttributes = label.attributes.map((_attrLabel: any): string => _attrLabel.name);
                    return (
                        <React.Fragment key={modelLabel}>
                            {
                                renderMappingRow(color,
                                    modelLabel,
                                    label.name,
                                    'Remove the mapped label',
                                    (): void => {
                                        const newMapping = { ...mapping };
                                        delete newMapping[modelLabel];
                                        setMapping(newMapping);

                                        const newAttrMatches = { ...attrMatches };
                                        delete newAttrMatches[modelLabel];
                                        setAttrMatch({ ...newAttrMatches });
                                    })
                            }
                            {
                                Object.keys(mapping[modelLabel].attributes || {})
                                    .map((mappedModelAttr: string) => (
                                        renderMappingRow(
                                            consts.NEW_LABEL_COLOR,
                                            mappedModelAttr,
                                            mapping[modelLabel].attributes[mappedModelAttr],
                                            'Remove the mapped attribute',
                                            (): void => {
                                                const newMapping = { ...mapping };
                                                delete mapping[modelLabel].attributes[mappedModelAttr];
                                                setMapping(newMapping);
                                            },
                                            'cvat-run-model-label-attribute-block',
                                        )
                                    ))
                            }
                            {notMatchedModelAttributes.length && taskAttributes.length ? (
                                <Row justify='start' align='middle'>
                                    <Col span={10}>
                                        {renderSelector(
                                            attrMatches[modelLabel]?.model || '',
                                            'Model attr labels', notMatchedModelAttributes.map((l) => l.name),
                                            (modelAttrLabel: string) => updateAttrMatch(
                                                modelLabel, modelAttrLabel, null,
                                            ),
                                            'cvat-run-model-label-attribute-block',
                                        )}
                                    </Col>
                                    <Col span={10} offset={1}>
                                        {renderSelector(
                                            attrMatches[modelLabel]?.task || '',
                                            'Task attr labels', taskAttributes,
                                            (taskAttrLabel: string) => updateAttrMatch(
                                                modelLabel, null, taskAttrLabel,
                                            ),
                                            'cvat-run-model-label-attribute-block',
                                        )}
                                    </Col>
                                    <Col span={1} offset={1}>
                                        <CVATTooltip title='Specify an attribute mapping between model label and task label attributes'>
                                            <QuestionCircleOutlined className='cvat-info-circle-icon' />
                                        </CVATTooltip>
                                    </Col>
                                </Row>
                            ) : null}
                        </React.Fragment>
                    );
                }) : null}
            {isDetector && !!taskLabels.length && !!modelLabels.length ? (
                <>
                    <Row justify='start' align='middle'>
                        <Col span={10}>
                            {renderSelector(match.model || '', 'Model labels', modelLabels, (modelLabel: string) => updateMatch(modelLabel, null))}
                        </Col>
                        <Col span={10} offset={1}>
                            {renderSelector(match.task || '', 'Task labels', taskLabels, (taskLabel: string) => updateMatch(null, taskLabel))}
                        </Col>
                        <Col span={1} offset={1}>
                            <CVATTooltip title='Specify a label mapping between model labels and task labels'>
                                <QuestionCircleOutlined className='cvat-info-circle-icon' />
                            </CVATTooltip>
                        </Col>
                    </Row>
                </>
            ) : null}
            {isDetector && withCleanup ? (
                <div>
                    <Checkbox
                        checked={cleanup}
                        onChange={(e: CheckboxChangeEvent): void => setCleanup(e.target.checked)}
                    >
                        Clean old annotations
                    </Checkbox>
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
                        disabled={!buttonEnabled}
                        type='primary'
                        onClick={() => {
                            const detectorRequestBody: DetectorRequestBody = {
                                mapping,
                                cleanup,
                            };

                            runInference(
                                model,
                                model.type === 'detector' ? detectorRequestBody : {
                                    threshold,
                                    max_distance: distance,
                                },
                            );
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
