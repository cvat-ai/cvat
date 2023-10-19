// eslint-disable

import React, { useEffect, useState } from 'react';
import { Attribute, Label } from 'cvat-core-wrapper';
import { DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import {
    Col, Row, Select, Tag,
} from 'antd';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    leftData: object[];
    rightData: object[];
    defaultMapping: [object, object][];
    allowManyToOne: boolean;
    rowClassName: string;
    containerClassName: string;
    deleteMappingLabel: string;
    infoMappingLabel: string;
    getObjectName(object: object): string;
    filterObjects(left: object | null | object[], right: object | null | object[]): object[];
    onUpdateMapping(mapping: [object, object][]): void;
}

function ObjectMapperComponent(props: Props): JSX.Element {
    const {
        leftData, rightData, defaultMapping, allowManyToOne,
        rowClassName, containerClassName, deleteMappingLabel, infoMappingLabel,
        getObjectName, onUpdateMapping, filterObjects,
    } = props;

    const [mapping, setMapping] = useState<Props['defaultMapping']>(defaultMapping);
    const [leftValue, setLeftValue] = useState<object | null>(null);
    const [rightValue, setRightValue] = useState<object | null>(null);

    const notMappedLeft = leftData.filter((left) => !mapping.flat().includes(left));
    const notMappedRight = (): object[] => {
        if (allowManyToOne) {
            return rightData;
        }
        return rightData.filter((right) => !mapping.flat().includes(right));
    };

    useEffect(() => {
        if (leftValue && rightValue) {
            setMapping([...mapping, [leftValue, rightValue]]);
            setLeftValue(null);
            setRightValue(null);
        }
    }, [leftValue, rightValue]);

    useEffect(() => {
        onUpdateMapping(mapping);
    }, [mapping]);

    return (
        <div className={containerClassName}>
            { mapping.map((mappingItem, idx) => {
                const [left, right] = mappingItem;
                const leftName = getObjectName(left);
                const rightName = getObjectName(right);
                return (
                    <>
                        <Row className={rowClassName} key={`${leftName}:${rightName}`}>
                            <Col span={10}>
                                <Tag key={leftName}>{leftName}</Tag>
                            </Col>
                            <Col span={10} offset={1}>
                                <Tag key={rightName}>{rightName}</Tag>
                            </Col>
                            <Col span={1} offset={1}>
                                <CVATTooltip title={deleteMappingLabel}>
                                    <DeleteOutlined
                                        className='cvat-danger-circle-icon'
                                        onClick={() => setMapping(
                                            mapping.filter((_mapping) => mappingItem !== _mapping),
                                        )}
                                    />
                                </CVATTooltip>
                            </Col>
                        </Row>

                        {/* {
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
                        } */}
                    </>
                );
            })}

            { (leftValue === null || rightValue === null) && (
                <Row className={rowClassName}>
                    <Col span={10}>
                        <Select
                            size='small'
                            onChange={(value) => {
                                setLeftValue(notMappedLeft
                                    .find((obj) => getObjectName(obj) === value) || null);
                            }}
                        >
                            {filterObjects(notMappedLeft, rightValue).map((obj) => (
                                <Select.Option
                                    key={getObjectName(obj)}
                                    value={getObjectName(obj)}
                                >
                                    {getObjectName(obj)}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={10} offset={1}>
                        <Select
                            size='small'
                            onChange={(value) => {
                                setRightValue(notMappedRight()
                                    .find((obj) => getObjectName(obj) === value) || null);
                            }}
                        >
                            {filterObjects(leftValue, notMappedRight()).map((obj) => (
                                <Select.Option
                                    key={getObjectName(obj)}
                                    value={getObjectName(obj)}
                                >
                                    {getObjectName(obj)}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={1} offset={1}>
                        <CVATTooltip title={infoMappingLabel}>
                            <QuestionCircleOutlined className='cvat-info-circle-icon' />
                        </CVATTooltip>
                    </Col>
                </Row>
            )}
        </div>
    );
}

export default React.memo(ObjectMapperComponent);
