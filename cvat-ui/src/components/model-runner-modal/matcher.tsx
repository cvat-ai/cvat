// eslint-disable

import React, { useEffect, useState } from 'react';
import { Attribute, Label } from 'cvat-core-wrapper';
import { DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import Text from 'antd/lib/typography/Text';
import {
    Col, Row, Select, Tag,
} from 'antd';

import CVATTooltip from 'components/common/cvat-tooltip';
import ObjectMatcher from './object-matcher';

// The third tuple element  is attributes mapping
// The latest tuple element is child mapping (e.g. for skeleton points)
export type Md2JobLabelsMapping = [
    LabelInterface,
    LabelInterface,
    [AttributeInterface | null, AttributeInterface | null][],
    Md2JobLabelsMapping,
][];

export interface AttributeInterface {
    name: Attribute['name'];
    values: Attribute['values'];
    input_type: Attribute['inputType'];
}

export interface LabelInterface {
    name: Label['name'];
    type: Label['type'];
    color?: Label['color'];
    attributes?: AttributeInterface[];
    elements?: Omit<LabelInterface, 'elements'>[];
}

interface Props {
    modelLabels: LabelInterface[];
    taskLabels: LabelInterface[];
    allowManyToOne?: boolean;
    onUpdateMapping(mapping: Md2JobLabelsMapping): void;
}

function labelsCompatible(modelLabel: LabelInterface, taskLabel: LabelInterface): boolean {
    return modelLabel.type === taskLabel.type || (modelLabel.type === 'unknown' && taskLabel.type !== 'skeleton');
}

function computeAutoMapping(
    modelLabels: LabelInterface[],
    taskLabels: LabelInterface[],
): Md2JobLabelsMapping {
    const autoMapping: Md2JobLabelsMapping = [];
    for (let i = 0; i < modelLabels.length; i++) {
        for (let j = 0; j < taskLabels.length; j++) {
            const modelLabel = modelLabels[i];
            const taskLabel = taskLabels[j];
            if (modelLabel.name === taskLabel.name && labelsCompatible(modelLabel, taskLabel)) {
                autoMapping.push([modelLabel, taskLabel, [], []]);
            }
        }
    }
    return autoMapping;
}

function LabelsMapperComponent(props: Props): JSX.Element {
    const {
        modelLabels, taskLabels, allowManyToOne, onUpdateMapping,
    } = props;
    const [mapping, setMapping] = useState<Md2JobLabelsMapping>([]);
    const [modelLabelValue, setModelLabelValue] = useState<LabelInterface | null>(null);
    const [taskLabelValue, setTaskLabelValue] = useState<LabelInterface | null>(null);

    const notMappedModelLabels = modelLabels.filter((modelLabel) => !mapping.flat().includes(modelLabel));
    const notMappedTaskLabels = (): LabelInterface[] => {
        if (allowManyToOne) {
            return taskLabels;
        }
        return taskLabels.filter((taskLabel) => !mapping.flat().includes(taskLabel));
    };

    useEffect(() => {
        setMapping(computeAutoMapping(modelLabels, taskLabels));
    }, [modelLabels, taskLabels]);

    useEffect(() => {
        if (taskLabelValue && modelLabelValue) {
            const copy = mapping.slice(0);
            copy.push([modelLabelValue, taskLabelValue, [], []]);
            setMapping(copy);
            setTaskLabelValue(null);
            setModelLabelValue(null);
        }
    }, [taskLabelValue, modelLabelValue]);

    useEffect(() => {
        onUpdateMapping(mapping);
    }, [mapping]);

    const rowClassName = 'cvat-runner-label-mapping-row';
    return (
        <div className='cvat-runner-label-mapper'>
            { mapping.map((mappingItem, idx) => (
                <>
                    <Row className={rowClassName} key={`${mappingItem[0].name}:${mappingItem[1]}`}>
                        <Col span={10}>
                            <Tag color={mappingItem[1]?.color} key={mappingItem[0].name}>{mappingItem[0].name}</Tag>
                        </Col>
                        <Col span={10} offset={1}>
                            <Tag color={mappingItem[1]?.color} key={mappingItem[1].name}>{mappingItem[1].name}</Tag>
                        </Col>
                        <Col span={1} offset={1}>
                            <CVATTooltip title='Remove mapped label'>
                                <DeleteOutlined
                                    className='cvat-danger-circle-icon'
                                    onClick={() => setMapping(
                                        mapping.filter((_mapping) => mappingItem !== _mapping),
                                    )}
                                />
                            </CVATTooltip>
                        </Col>
                    </Row>
                    {
                        mappingItem[0].type === 'skeleton' && mappingItem[1].type === 'skeleton' && (
                            <>
                                <hr />
                                <Text strong>Skeleton points mapping: </Text>
                                <LabelsMapperComponent
                                    modelLabels={mappingItem[0].elements || []}
                                    taskLabels={mappingItem[1].elements || []}
                                    onUpdateMapping={(pointsMapping) => {
                                        const copy = [...mapping];
                                        copy[idx][3] = pointsMapping;
                                        setMapping(copy);
                                    }}
                                />
                                <hr />
                            </>
                        )
                    }
                    {
                        !!mappingItem[0].attributes?.length && !!mappingItem[1].attributes?.length && (
                            <>
                                <hr />
                                <Text strong>Label attributes mapping: </Text>
                                <ObjectMatcher
                                    leftData={mappingItem[0].attributes}
                                    rightData={mappingItem[1].attributes}
                                    allowManyToOne={false}
                                    defaultMapping={[]}
                                    rowClassName='cvat-runner-attribute-mapping-row'
                                    containerClassName='cvat-runner-attribute-mapper'
                                    deleteMappingLabel='Remove mapped attribute'
                                    infoMappingLabel='Specify mapping between model attributes and job attributes'
                                    getObjectName={(object: AttributeInterface) => object.name}
                                    filterObjects={(
                                        left: AttributeInterface | null | AttributeInterface[],
                                        right: AttributeInterface | null | AttributeInterface[]
                                    ): AttributeInterface[] => {
                                        if (Array.isArray(left)) return left;
                                        if (Array.isArray(right)) return right;
                                        return [];
                                    }}
                                    onUpdateMapping={(_mapping: [AttributeInterface, AttributeInterface][]) => {
                                        const mapped = mapping.map((_mappingItem) => {
                                            if (_mappingItem === mappingItem) {
                                                return [
                                                    mappingItem[0], mappingItem[1], _mapping, mappingItem[3],
                                                ] as Md2JobLabelsMapping[0];
                                            }

                                            return _mappingItem;
                                        });
                                        setMapping(mapped);
                                    }}
                                />
                                <hr />
                            </>
                        )
                    }
                </>
            ))}

            { modelLabelValue !== null && taskLabelValue === null && (
                <Row className={rowClassName} key={`${modelLabelValue.name}:null`}>
                    <Col span={10}>
                        <Tag key={modelLabelValue.name}>{modelLabelValue.name}</Tag>
                    </Col>
                    <Col span={10} offset={1}>
                        <Select
                            onChange={(value) => {
                                setTaskLabelValue(notMappedTaskLabels()
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedTaskLabels()
                                .filter((label) => labelsCompatible(modelLabelValue, label)).map((label) => (
                                    <Select.Option key={label.name} value={label.name}>{label.name}</Select.Option>
                                ))}
                        </Select>
                    </Col>
                    <Col span={1} offset={1}>
                        <CVATTooltip title='Remove mapped label'>
                            <DeleteOutlined
                                className='cvat-danger-circle-icon'
                                onClick={() => setModelLabelValue(null)}
                            />
                        </CVATTooltip>
                    </Col>
                </Row>
            )}

            { modelLabelValue === null && taskLabelValue !== null && (
                <Row className={rowClassName} key={`null:${taskLabelValue.name}`}>
                    <Col span={10}>
                        <Select
                            onChange={(value) => {
                                setModelLabelValue(notMappedModelLabels
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedModelLabels
                                .filter((label) => labelsCompatible(label, taskLabelValue)).map((label) => (
                                    <Select.Option
                                        key={label.name}
                                        value={label.name}
                                    >
                                        {label.name}
                                    </Select.Option>
                                ))}
                        </Select>
                    </Col>
                    <Col span={10} offset={1}>
                        <Tag color={taskLabelValue.color} key={taskLabelValue.name}>{taskLabelValue.name}</Tag>
                    </Col>
                    <Col span={1} offset={1}>
                        <CVATTooltip title='Remove mapped label'>
                            <DeleteOutlined
                                className='cvat-danger-circle-icon'
                                onClick={() => setTaskLabelValue(null)}
                            />
                        </CVATTooltip>
                    </Col>
                </Row>
            )}

            { modelLabelValue === null && taskLabelValue === null && !!notMappedModelLabels.length && (
                <Row className={rowClassName}>
                    <Col span={10}>
                        <Select
                            onChange={(value) => {
                                setModelLabelValue(notMappedModelLabels
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedModelLabels.map((label) => (
                                <Select.Option
                                    key={label.name}
                                    value={label.name}
                                >
                                    {label.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={10} offset={1}>
                        <Select
                            onChange={(value) => {
                                setTaskLabelValue(notMappedTaskLabels()
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedTaskLabels().map((label) => (
                                <Select.Option
                                    key={label.name}
                                    value={label.name}
                                >
                                    {label.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={1} offset={1}>
                        <CVATTooltip title='Specify a label mapping between model labels and task labels'>
                            <QuestionCircleOutlined className='cvat-info-circle-icon' />
                        </CVATTooltip>
                    </Col>
                </Row>
            )}
        </div>
    );
}

export default React.memo(LabelsMapperComponent);
