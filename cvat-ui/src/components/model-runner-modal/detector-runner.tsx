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

import { Model, ModelAttribute, StringObject } from 'reducers/interfaces';

import CVATTooltip from 'components/common/cvat-tooltip';
import { clamp } from 'utils/math';
import consts from 'consts';
import { DimensionType } from '../../reducers/interfaces';

interface Props {
    withCleanup: boolean;
    models: Model[];
    labels: any[];
    dimension: DimensionType;
    runInference(model: Model, body: object): void;
}

interface LabelAttributesModel {
    name: string;
    attributes: StringObject;
}

type LabelsModel = Record<string, LabelAttributesModel>;

interface Mapping {
    model: string | null;
    task: string | null;
}

function DetectorRunner(props: Props): JSX.Element {
    const {
        models, withCleanup, labels, dimension, runInference,
    } = props;

    const [modelID, setModelID] = useState<string | null>(null);
    const [mapping, setMapping] = useState<LabelsModel>({});
    const [threshold, setThreshold] = useState<number>(0.5);
    const [distance, setDistance] = useState<number>(50);
    const [cleanup, setCleanup] = useState<boolean>(false);
    const [match, setMatch] = useState<Mapping>({
        model: null,
        task: null,
    });
    const [attrMatches, setAttrMatch] = useState<Record<string, Mapping>>({});

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

    function matchAttributes(label: any, currentModel: Model, modelMatch: string): {} {
        let attributes = {};
        if (label.attributes) {
            const modelAttributes = currentModel.attributes[modelMatch];

            if (Array.isArray(modelAttributes)) {
                attributes = label.attributes
                    .reduce((attrAcc: StringObject, attr: any): StringObject => {
                        if (modelAttributes.some((mAttr) => mAttr.name === attr.name)) {
                            attrAcc[attr.name] = attr.name;
                        }

                        return attrAcc;
                    }, {});
            }
        }

        return attributes;
    }

    function updateMatch(modelLabel: string | null, taskLabel: string | null): void {
        function addMatch(modelMatch: string, taskMatch: string): void {
            const newMatch: LabelsModel = {};
            const label = labels.find((l) => l.name === taskMatch);
            const currentModel = models.filter((_model): boolean => _model.id === modelID)[0];
            const attributes = matchAttributes(label, currentModel, modelMatch);

            newMatch[modelMatch] = { name: taskMatch, attributes };
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
                            const newModel = models.filter((_model): boolean => _model.id === _modelID)[0];
                            const newMapping = labels.reduce((acc: LabelsModel, label: any): LabelsModel => {
                                if (newModel.labels.includes(label.name)) {
                                    const res: LabelAttributesModel = {
                                        name: label.name,
                                        attributes: {},
                                    };

                                    res.attributes = matchAttributes(label, newModel, label.name);

                                    acc[label.name] = res;
                                }
                                return acc;
                            }, {});

                            setMapping(newMapping);
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
                !!Object.keys(mapping).length &&
                Object.keys(mapping).map((modelLabel: string) => {
                    const label = labels
                        .find((_label: any): boolean => _label.name === mapping[modelLabel].name);
                    const color = label ? label.color : consts.NEW_LABEL_COLOR;
                    const attributeLabels = model.attributes[modelLabel]
                        .filter((_label: ModelAttribute): boolean => !(_label.name in mapping[modelLabel].attributes));
                    const taskAttrLabels = labels
                        .find((_label: any) => _label.name === mapping[modelLabel].name)
                        .attributes
                        .map((_attrLabel: any): string => _attrLabel.name);
                    return (
                        <React.Fragment key={modelLabel}>
                            {
                                renderMappingRow(color,
                                    modelLabel,
                                    mapping[modelLabel].name,
                                    'Remove the mapped values',
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
                                Object.keys(mapping[modelLabel].attributes)
                                    .map((attributeLabel: string) => (
                                        renderMappingRow(
                                            consts.NEW_LABEL_COLOR,
                                            attributeLabel,
                                            mapping[modelLabel].attributes[attributeLabel],
                                            'Remove the mapped attributes',
                                            (): void => {
                                                const newMapping = { ...mapping };
                                                delete mapping[modelLabel]
                                                    .attributes[attributeLabel];
                                                setMapping(newMapping);
                                            },
                                            'cvat-run-model-label-attribute-block',
                                        )
                                    ))
                            }
                            {!!attributeLabels.length && !!taskAttrLabels.length && (
                                <Row justify='start' align='middle'>
                                    <Col span={10}>
                                        {renderSelector(
                                            attrMatches[modelLabel]?.model || '',
                                            'Model attr labels', attributeLabels.map((l) => l.name),
                                            (modelAttrLabel: string) => updateAttrMatch(
                                                modelLabel, modelAttrLabel, null,
                                            ),
                                            'cvat-run-model-label-attribute-block',
                                        )}
                                    </Col>
                                    <Col span={10} offset={1}>
                                        {renderSelector(
                                            attrMatches[modelLabel]?.task || '',
                                            'Task attr labels', taskAttrLabels,
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
                            )}
                        </React.Fragment>
                    );
                })}
            {isDetector && !!taskLabels.length && !!modelLabels.length && (
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
            )}
            {isDetector && withCleanup && (
                <div>
                    <Checkbox
                        checked={cleanup}
                        onChange={(e: CheckboxChangeEvent): void => setCleanup(e.target.checked)}
                    >
                        Clean old annotations
                    </Checkbox>
                </div>
            )}
            {isReId && (
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
            )}
            <Row align='middle' justify='end'>
                <Col>
                    <Button
                        disabled={!buttonEnabled}
                        type='primary'
                        onClick={() => {
                            runInference(
                                model,
                                model.type === 'detector' ?
                                    {
                                        mapping: Object.entries(mapping)
                                            .reduce((acc, [key, { name }]) => ({ ...acc, [key]: name }), {}),
                                        attrMapping: mapping,
                                        cleanup,
                                    } :
                                    {
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
