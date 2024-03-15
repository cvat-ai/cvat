// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Tag from 'antd/lib/tag';
import { DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { computeTextColor } from 'utils/compute-text-color';

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
    getObjectColor(object: object): string | undefined;
    filterObjects(left: object | null | object[], right: object | null | object[]): object[];
    onUpdateMapping(mapping: [object, object][]): void;
    rowExtras?(left: object, right: object): JSX.Element[];
}

function ObjectMapperComponent(props: Props): JSX.Element {
    const {
        leftData, rightData, defaultMapping, allowManyToOne,
        rowClassName, containerClassName, deleteMappingLabel, infoMappingLabel,
        getObjectName, getObjectColor, onUpdateMapping, filterObjects, rowExtras,
    } = props;

    const [mapping, setMapping] = useState<Props['defaultMapping']>(defaultMapping);
    const [leftValue, setLeftValue] = useState<object | null>(null);
    const [rightValue, setRightValue] = useState<object | null>(null);

    const setMappingWrapper = (updated: Props['defaultMapping']): void => {
        // if we prefer useEffect instead of this approch
        // component will be rerendered first with extras that depends on parent state
        // these extras will use outdated information in this case
        onUpdateMapping(updated);
        setMapping(updated);
    };

    const notMappedLeft = leftData.filter((left) => !mapping.flat().includes(left));
    const notMappedRight = (): object[] => {
        if (allowManyToOne) {
            return rightData;
        }
        return rightData.filter((right) => !mapping.flat().includes(right));
    };

    useEffect(() => {
        setMappingWrapper(defaultMapping);
    }, [leftData, rightData]);

    useEffect(() => {
        if (leftValue && rightValue) {
            setMappingWrapper([...mapping, [leftValue, rightValue]]);
            setLeftValue(null);
            setRightValue(null);
        }
    }, [leftValue, rightValue]);

    return (
        <div className={containerClassName}>
            { mapping.map((mappingItem) => {
                const [left, right] = mappingItem;
                const leftName = getObjectName(left);
                const rightName = getObjectName(right);
                const color = getObjectColor(left) || getObjectColor(right);
                const textColor = computeTextColor(color || '#000000');

                return (
                    <React.Fragment key={`${leftName}:${rightName}`}>
                        <Row className={rowClassName} key={`${leftName}:${rightName}`}>
                            <Col span={10}>
                                <Tag style={{ color: textColor }} color={color} key={leftName}>{leftName}</Tag>
                            </Col>
                            <Col span={10} offset={1}>
                                <Tag style={{ color: textColor }} color={color} key={rightName}>{rightName}</Tag>
                            </Col>
                            <Col span={1} offset={1}>
                                <CVATTooltip title={deleteMappingLabel}>
                                    <DeleteOutlined
                                        className='cvat-danger-circle-icon'
                                        onClick={() => setMappingWrapper(
                                            mapping.filter((_mapping) => mappingItem !== _mapping),
                                        )}
                                    />
                                </CVATTooltip>
                            </Col>
                        </Row>

                        { rowExtras ? rowExtras(mappingItem[0], mappingItem[1]) : null }
                    </React.Fragment>
                );
            })}

            { (leftValue === null || rightValue === null) && !!notMappedLeft.length && (
                <Row className={rowClassName}>
                    <Col span={10}>
                        <Select
                            virtual
                            showSearch
                            value={leftValue ? getObjectName(leftValue) : null}
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
                            virtual
                            showSearch
                            value={rightValue ? getObjectName(rightValue) : null}
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
                        { (leftValue === null && rightValue === null) ? (
                            <Col span={1} offset={1}>
                                <CVATTooltip title={infoMappingLabel}>
                                    <QuestionCircleOutlined className='cvat-info-circle-icon' />
                                </CVATTooltip>
                            </Col>
                        ) : (
                            <CVATTooltip title={deleteMappingLabel}>
                                <DeleteOutlined
                                    className='cvat-danger-circle-icon'
                                    onClick={() => {
                                        setLeftValue(null);
                                        setRightValue(null);
                                    }}
                                />
                            </CVATTooltip>
                        )}
                    </Col>
                </Row>
            )}
        </div>
    );
}

export default React.memo(ObjectMapperComponent);
