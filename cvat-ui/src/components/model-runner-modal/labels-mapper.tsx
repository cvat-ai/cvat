// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef } from 'react';
import Text from 'antd/lib/typography/Text';

import { Attribute, Label, ShapeType } from 'cvat-core-wrapper';
import ObjectMatcher from './object-mapper';

export type Md2JobAttributesMapping = [AttributeInterface | null, AttributeInterface | null][];
export type Md2JobLabelsMapping = [LabelInterface, LabelInterface][];

// The latest tuple element is child mapping (e.g. for skeleton points)
export type FullMapping = [LabelInterface, LabelInterface, Md2JobAttributesMapping, FullMapping][];

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
    sublabels?: Omit<LabelInterface, 'sublabels'>[];
}

interface Props {
    modelLabels: LabelInterface[];
    taskLabels: LabelInterface[];
    onUpdateMapping(mapping: FullMapping): void;
}

function labelsCompatible(modelLabel: LabelInterface, jobLabel: LabelInterface): boolean {
    const { type: modelLabelType } = modelLabel;
    const { type: jobLabelType } = jobLabel;
    const compatibleTypes = [[ShapeType.MASK, ShapeType.POLYGON]];
    return modelLabelType === jobLabelType ||
        (jobLabelType === 'any' && modelLabelType !== ShapeType.SKELETON) ||
        (modelLabelType === 'unknown' && jobLabelType !== ShapeType.SKELETON) || // legacy support
        compatibleTypes.some((compatible) => compatible.includes(jobLabelType) && compatible.includes(modelLabelType));
}

function computeLabelsAutoMapping(
    modelLabels: LabelInterface[],
    taskLabels: LabelInterface[],
): Md2JobLabelsMapping {
    const autoMapping: Md2JobLabelsMapping = [];
    for (let i = 0; i < modelLabels.length; i++) {
        for (let j = 0; j < taskLabels.length; j++) {
            const modelLabel = modelLabels[i];
            const taskLabel = taskLabels[j];
            if (modelLabel.name === taskLabel.name && labelsCompatible(modelLabel, taskLabel)) {
                autoMapping.push([modelLabel, taskLabel]);
            }
        }
    }
    return autoMapping;
}

function computeAttributesAutoMapping(
    modelAttributes: AttributeInterface[],
    taskAttributes: AttributeInterface[],
): Md2JobAttributesMapping {
    const autoMapping: Md2JobAttributesMapping = [];
    for (let i = 0; i < modelAttributes.length; i++) {
        for (let j = 0; j < taskAttributes.length; j++) {
            const modelAttribute = modelAttributes[i];
            const taskAttribute = taskAttributes[j];
            if (modelAttribute.name === taskAttribute.name) {
                autoMapping.push([modelAttribute, taskAttribute]);
            }
        }
    }
    return autoMapping;
}

function LabelsMapperComponent(props: Props): JSX.Element {
    const { modelLabels, taskLabels, onUpdateMapping } = props;
    const mappingRef = useRef<FullMapping>([]);
    const setMapping = useCallback((_mapping: FullMapping) => {
        mappingRef.current = _mapping;
        onUpdateMapping(_mapping);
    }, [onUpdateMapping]);

    return (
        <ObjectMatcher
            leftData={modelLabels}
            rightData={taskLabels}
            allowManyToOne
            defaultMapping={computeLabelsAutoMapping(modelLabels, taskLabels)}
            deleteMappingLabel='Remove mapped label'
            infoMappingLabel='Specify mapping between labels'
            containerClassName='cvat-runner-label-mapper'
            rowClassName='cvat-runner-label-mapping-row'
            getObjectName={(object: LabelInterface) => object.name}
            getObjectColor={(object: LabelInterface) => object.color}
            filterObjects={(
                left: LabelInterface | null | LabelInterface[],
                right: LabelInterface | null | LabelInterface[],
            ): LabelInterface[] => {
                if (Array.isArray(left) && !Array.isArray(right)) {
                    if (right) {
                        return left.filter((leftLabel) => labelsCompatible(leftLabel, right));
                    }

                    return left;
                }

                if (!Array.isArray(left) && Array.isArray(right)) {
                    if (left) {
                        return right.filter((rightLabel) => labelsCompatible(left, rightLabel));
                    }

                    return right;
                }

                return [];
            }}
            rowExtras={(modelLabel: LabelInterface, taskLabel: LabelInterface): JSX.Element[] => {
                const extras = [];

                if (modelLabel.type === ShapeType.SKELETON && taskLabel.type === ShapeType.SKELETON) {
                    extras.push(
                        <React.Fragment key='skeleton'>
                            <hr />
                            <Text strong>Skeleton points mapping: </Text>
                            <ObjectMatcher
                                leftData={modelLabel.sublabels || []}
                                rightData={taskLabel.sublabels || []}
                                allowManyToOne={false}
                                defaultMapping={computeLabelsAutoMapping(
                                    modelLabel.sublabels || [],
                                    taskLabel.sublabels || [],
                                )}
                                rowClassName='cvat-runner-label-mapping-row'
                                containerClassName='cvat-runner-label-mapper'
                                deleteMappingLabel='Remove mapped label'
                                infoMappingLabel='Specify mapping between skeleton sublabels'
                                getObjectName={(object: LabelInterface) => object.name}
                                getObjectColor={(object: LabelInterface) => object.color}
                                filterObjects={(
                                    left: LabelInterface | null | LabelInterface[],
                                    right: LabelInterface | null | LabelInterface[],
                                ): LabelInterface[] => {
                                    if (Array.isArray(left)) return left;
                                    if (Array.isArray(right)) return right;
                                    return [];
                                }}
                                onUpdateMapping={(sublabelsMapping: [LabelInterface, LabelInterface][]) => {
                                    const mapping = mappingRef.current;
                                    const updatedFullMapping = mapping.map((mappingItem) => {
                                        if (mappingItem[0] === modelLabel && mappingItem[1] === taskLabel) {
                                            return [
                                                modelLabel,
                                                taskLabel,
                                                mappingItem[2],
                                                sublabelsMapping.map(([modelElement, taskElement]) => ([
                                                    modelElement,
                                                    taskElement,
                                                    [],
                                                    [],
                                                ])),
                                            ] as FullMapping[0];
                                        }

                                        return mappingItem;
                                    });
                                    setMapping(updatedFullMapping);
                                }}
                            />
                            <hr />
                        </React.Fragment>,
                    );
                }

                if (modelLabel.attributes?.length && taskLabel.attributes?.length) {
                    extras.push(
                        <React.Fragment key='attributes'>
                            <hr />
                            <Text strong>Label attributes mapping: </Text>
                            <ObjectMatcher
                                leftData={modelLabel.attributes}
                                rightData={taskLabel.attributes}
                                allowManyToOne={false}
                                defaultMapping={computeAttributesAutoMapping(
                                    modelLabel.attributes || [],
                                    taskLabel.attributes || [],
                                ) as [AttributeInterface, AttributeInterface][]}
                                rowClassName='cvat-runner-attribute-mapping-row'
                                containerClassName='cvat-runner-attribute-mapper'
                                deleteMappingLabel='Remove mapped attribute'
                                infoMappingLabel='Specify mapping between attributes'
                                getObjectName={(object: AttributeInterface) => object.name}
                                getObjectColor={() => taskLabel.color}
                                filterObjects={(
                                    left: AttributeInterface | null | AttributeInterface[],
                                    right: AttributeInterface | null | AttributeInterface[],
                                ): AttributeInterface[] => {
                                    if (Array.isArray(left)) return left;
                                    if (Array.isArray(right)) return right;
                                    return [];
                                }}
                                onUpdateMapping={(_attrMapping: [AttributeInterface, AttributeInterface][]) => {
                                    const mapping = mappingRef.current;
                                    const updatedFullMapping = mapping.map((mappingItem) => {
                                        if (mappingItem[0] === modelLabel && mappingItem[1] === taskLabel) {
                                            return [
                                                modelLabel,
                                                taskLabel,
                                                _attrMapping,
                                                mappingItem[3],
                                            ] as FullMapping[0];
                                        }

                                        return mappingItem;
                                    });
                                    setMapping(updatedFullMapping);
                                }}
                            />
                            <hr />
                        </React.Fragment>,
                    );
                }

                return extras;
            }}
            onUpdateMapping={(_mapping: [LabelInterface, LabelInterface][]) => {
                const updatedFullMapping = _mapping.reduce<FullMapping>(
                    (acc, [modelLabel, taskLabel]) => {
                        for (const existingMappingItem of mappingRef.current) {
                            if (existingMappingItem[0] === modelLabel && existingMappingItem[1] === taskLabel) {
                                return [...acc, existingMappingItem];
                            }
                        }

                        return [...acc, [modelLabel, taskLabel, [], []]];
                    }, [],
                );
                setMapping(updatedFullMapping);
            }}
        />
    );
}

export default React.memo(LabelsMapperComponent);
