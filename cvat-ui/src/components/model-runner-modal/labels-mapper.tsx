// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef } from 'react';

import { Attribute, Label, LabelType } from 'cvat-core-wrapper';
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
    const compatibleTypes = [[LabelType.MASK, LabelType.POLYGON]];
    return modelLabelType === jobLabelType ||
        (jobLabelType === 'any' && modelLabelType !== LabelType.SKELETON) ||
        (modelLabelType === 'unknown' && jobLabelType !== LabelType.SKELETON) || // legacy support
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

    function getMappingItem(
        modelLabel: LabelInterface, taskLabel: LabelInterface, source: FullMapping,
    ): [number, FullMapping[0] | undefined] {
        const index = source.findIndex((el) => el[0] === modelLabel && el[1] === taskLabel);
        if (index !== -1) {
            return [index, source[index]];
        }

        return [-1, undefined];
    }

    const updateSublabelAttributesMapping = (
        modelLabel: LabelInterface, taskLabel: LabelInterface,
    ) => (
        modelSublabel: LabelInterface, taskSublabel: LabelInterface,
    ) => (
        _attrMapping: [AttributeInterface, AttributeInterface][],
    ) => {
        const mapping = mappingRef.current;
        const [parentIndex, parentItem] = getMappingItem(modelLabel, taskLabel, mapping);
        const copy = mapping.filter((_, index) => index !== parentIndex);
        if (parentItem) {
            const [childIndex] = getMappingItem(modelSublabel, taskSublabel, parentItem[3]);
            copy.push([
                modelLabel, taskLabel, parentItem[2],
                [
                    ...parentItem[3].filter((_, index) => index !== childIndex),
                    [modelSublabel, taskSublabel, _attrMapping, []],
                ],
            ]);

            setMapping(copy);
        }
    };

    const updateSublabelsMapping = (
        modelLabel: LabelInterface, taskLabel: LabelInterface,
    ) => (sublabelsMapping: [LabelInterface, LabelInterface][]) => {
        const mapping = mappingRef.current;
        const [index, parentItem] = getMappingItem(modelLabel, taskLabel, mapping);
        if (parentItem) {
            const updated = sublabelsMapping.reduce<FullMapping>((acc, [modelSublabel, taskSublabel]) => {
                const [, item] = getMappingItem(modelSublabel, taskSublabel, parentItem[3]);
                // the code to avoid reset mapping for attributes
                if (item) {
                    return [...acc, item];
                }

                return [...acc, [modelSublabel, taskSublabel, [], []]];
            }, []);

            const copy = mapping.filter((_, _index: number) => index !== _index);
            copy.push([
                modelLabel, taskLabel, parentItem[2], updated,
            ] as FullMapping[0]);
            setMapping(copy);
        }
    };

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

                if (modelLabel.attributes?.length && taskLabel.attributes?.length) {
                    extras.push(
                        <React.Fragment key='attributes'>
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
                                infoMappingLabel='Specify mapping between label attributes'
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
                                    const [index, item] = getMappingItem(modelLabel, taskLabel, mapping);
                                    if (index !== -1 && item) {
                                        const copy = mapping.filter((_, _index: number) => index !== _index);
                                        copy.push([modelLabel, taskLabel, _attrMapping, item[3]] as FullMapping[0]);
                                        setMapping(copy);
                                    }
                                }}
                            />
                        </React.Fragment>,
                    );
                }

                if (modelLabel.type === LabelType.SKELETON && taskLabel.type === LabelType.SKELETON) {
                    extras.push(
                        <React.Fragment key='skeleton'>
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
                                rowExtras={(modelSublabel: LabelInterface, taskSublabel: LabelInterface) => {
                                    const sublabelRowExtras = [];

                                    if (modelSublabel.attributes?.length && taskSublabel.attributes?.length) {
                                        sublabelRowExtras.push(
                                            <React.Fragment key='attributes'>
                                                <ObjectMatcher
                                                    leftData={modelSublabel.attributes}
                                                    rightData={taskSublabel.attributes}
                                                    allowManyToOne={false}
                                                    defaultMapping={computeAttributesAutoMapping(
                                                        modelSublabel.attributes || [],
                                                        taskSublabel.attributes || [],
                                                    ) as [AttributeInterface, AttributeInterface][]}
                                                    rowClassName='cvat-runner-attribute-mapping-row'
                                                    containerClassName='cvat-runner-attribute-mapper'
                                                    deleteMappingLabel='Remove mapped attribute'
                                                    infoMappingLabel='Specify mapping between sublabel attributes'
                                                    getObjectName={(object: AttributeInterface) => object.name}
                                                    getObjectColor={() => taskSublabel.color}
                                                    filterObjects={(
                                                        left: AttributeInterface | null | AttributeInterface[],
                                                        right: AttributeInterface | null | AttributeInterface[],
                                                    ): AttributeInterface[] => {
                                                        if (Array.isArray(left)) return left;
                                                        if (Array.isArray(right)) return right;
                                                        return [];
                                                    }}
                                                    onUpdateMapping={
                                                        updateSublabelAttributesMapping(
                                                            modelLabel, taskLabel,
                                                        )(modelSublabel, taskSublabel)
                                                    }
                                                />
                                            </React.Fragment>,
                                        );
                                    }

                                    return sublabelRowExtras;
                                }}
                                onUpdateMapping={updateSublabelsMapping(modelLabel, taskLabel)}
                            />
                        </React.Fragment>,
                    );
                }

                return extras;
            }}
            onUpdateMapping={(_mapping: [LabelInterface, LabelInterface][]) => {
                const updated = _mapping.reduce<FullMapping>((acc, [modelLabel, taskLabel]) => {
                    const [index, item] = getMappingItem(modelLabel, taskLabel, mappingRef.current);
                    // the code to avoid reset mapping for sublabels/attributes
                    // when one of top level mappings was updated
                    if (index !== -1 && item) {
                        return [...acc, item];
                    }

                    return [...acc, [modelLabel, taskLabel, [], []]];
                }, []);

                setMapping(updated);
            }}
        />
    );
}

export default React.memo(LabelsMapperComponent);
