// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Select,
    Button,
    InputNumber,
    Radio,
} from 'antd';

import { RadioChangeEvent } from 'antd/lib/radio';
import Text from 'antd/lib/typography/Text';

import {
    ShapeType,
    RectDrawingMethod,
} from 'reducers/interfaces';

interface Props {
    shapeType: ShapeType;
    rectDrawingMethod: RectDrawingMethod;
    labels: any[];
    minimumPoints: number;
    numberOfPoints?: number;
    selectedLabeID: number;
    onChangeLabel(value: string): void;
    onChangePoints(value: number | undefined): void;
    onChangeRectDrawingMethod(event: RadioChangeEvent): void;
    onDrawTrack(): void;
    onDrawShape(): void;
}

function DrawShapePopoverComponent(props: Props): JSX.Element {
    const {
        labels,
        shapeType,
        minimumPoints,
        selectedLabeID,
        numberOfPoints,
        onDrawTrack,
        onDrawShape,
        onChangeLabel,
        onChangePoints,
        onChangeRectDrawingMethod,
    } = props;

    return (
        <div className='cvat-draw-shape-popover-content'>
            <Row type='flex' justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>{`Draw new ${shapeType}`}</Text>
                </Col>
            </Row>
            <Row type='flex' justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Label</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center'>
                <Col span={24}>
                    <Select
                        value={`${selectedLabeID}`}
                        onChange={onChangeLabel}
                    >
                        {
                            labels.map((label: any) => (
                                <Select.Option
                                    key={label.id}
                                    value={`${label.id}`}
                                >
                                    {label.name}
                                </Select.Option>
                            ))
                        }
                    </Select>
                </Col>
            </Row>
            {
                shapeType === ShapeType.RECTANGLE ? (
                    <>
                        <Row>
                            <Col>
                                <Text className='cvat-text-color'> Drawing method </Text>
                            </Col>
                        </Row>
                        <Row type='flex' justify='space-around'>
                            <Col>
                                <Radio.Group
                                    style={{ display: 'flex' }}
                                    defaultValue={RectDrawingMethod.BY_TWO_POINTS}
                                    onChange={onChangeRectDrawingMethod}
                                >
                                    <Radio
                                        value={RectDrawingMethod.BY_TWO_POINTS}
                                        style={{ width: 'auto' }}
                                    >
                                        By 2 Points
                                    </Radio>
                                    <Radio
                                        value={RectDrawingMethod.BY_FOUR_POINTS}
                                        style={{ width: 'auto' }}
                                    >
                                        By 4 Points
                                    </Radio>
                                </Radio.Group>
                            </Col>
                        </Row>
                    </>
                ) : (
                    <Row type='flex' justify='space-around' align='middle'>
                        <Col span={14}>
                            <Text className='cvat-text-color'> Number of points: </Text>
                        </Col>
                        <Col span={10}>
                            <InputNumber
                                onChange={onChangePoints}
                                className='cvat-draw-shape-popover-points-selector'
                                min={minimumPoints}
                                value={numberOfPoints}
                                step={1}
                            />
                        </Col>
                    </Row>
                )
            }
            <Row type='flex' justify='space-around'>
                <Col span={12}>
                    <Button
                        onClick={onDrawShape}
                    >
                        Shape
                    </Button>
                </Col>
                <Col span={12}>
                    <Button
                        onClick={onDrawTrack}
                    >
                        Track
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(DrawShapePopoverComponent);
