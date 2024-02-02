// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import InputNumber from 'antd/lib/input-number';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Text from 'antd/lib/typography/Text';
import { RectDrawingMethod, CuboidDrawingMethod } from 'cvat-canvas-wrapper';

import { ShapeType } from 'reducers';
import { clamp } from 'utils/math';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Label, DimensionType } from 'cvat-core-wrapper';

interface Props {
    shapeType: ShapeType;
    labels: any[];
    minimumPoints: number;
    rectDrawingMethod?: RectDrawingMethod;
    cuboidDrawingMethod?: CuboidDrawingMethod;
    numberOfPoints?: number;
    selectedLabelID: number | null;
    repeatShapeShortcut: string;
    onChangeLabel(value: Label | null): void;
    onChangePoints(value: number | undefined): void;
    onChangeRectDrawingMethod(event: RadioChangeEvent): void;
    onChangeCuboidDrawingMethod(event: RadioChangeEvent): void;
    onDrawTrack(): void;
    onDrawShape(): void;
    jobInstance: any;
}

function DrawShapePopoverComponent(props: Props): JSX.Element {
    const {
        labels,
        shapeType,
        minimumPoints,
        selectedLabelID,
        numberOfPoints,
        rectDrawingMethod,
        cuboidDrawingMethod,
        repeatShapeShortcut,
        onDrawTrack,
        onDrawShape,
        onChangeLabel,
        onChangePoints,
        onChangeRectDrawingMethod,
        onChangeCuboidDrawingMethod,
        jobInstance,
    } = props;

    const is2D = jobInstance.dimension === DimensionType.DIMENSION_2D;
    return (
        <div className='cvat-draw-shape-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>{`Draw new ${shapeType}`}</Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Label</Text>
                </Col>
            </Row>
            <Row justify='center'>
                <Col span={24}>
                    <LabelSelector
                        style={{ width: '100%' }}
                        labels={labels}
                        value={selectedLabelID}
                        onChange={onChangeLabel}
                    />
                </Col>
            </Row>
            {is2D && shapeType === ShapeType.RECTANGLE && (
                <>
                    <Row>
                        <Col>
                            <Text className='cvat-text-color'> Drawing method </Text>
                        </Col>
                    </Row>
                    <Row justify='space-around'>
                        <Col>
                            <Radio.Group
                                style={{ display: 'flex' }}
                                value={rectDrawingMethod}
                                onChange={onChangeRectDrawingMethod}
                            >
                                <Radio value={RectDrawingMethod.CLASSIC} style={{ width: 'auto' }}>
                                    By 2 Points
                                </Radio>
                                <Radio value={RectDrawingMethod.EXTREME_POINTS} style={{ width: 'auto' }}>
                                    By 4 Points
                                </Radio>
                            </Radio.Group>
                        </Col>
                    </Row>
                </>
            )}
            {is2D && shapeType === ShapeType.CUBOID && (
                <>
                    <Row>
                        <Col>
                            <Text className='cvat-text-color'> Drawing method </Text>
                        </Col>
                    </Row>
                    <Row justify='space-around'>
                        <Col>
                            <Radio.Group
                                style={{ display: 'flex' }}
                                value={cuboidDrawingMethod}
                                onChange={onChangeCuboidDrawingMethod}
                            >
                                <Radio value={CuboidDrawingMethod.CLASSIC} style={{ width: 'auto' }}>
                                    From rectangle
                                </Radio>
                                <Radio value={CuboidDrawingMethod.CORNER_POINTS} style={{ width: 'auto' }}>
                                    By 4 Points
                                </Radio>
                            </Radio.Group>
                        </Col>
                    </Row>
                </>
            )}
            {is2D && [ShapeType.POLYGON, ShapeType.POLYLINE, ShapeType.POINTS].includes(shapeType) ? (
                <Row justify='space-around' align='middle'>
                    <Col span={14}>
                        <Text className='cvat-text-color'> Number of points: </Text>
                    </Col>
                    <Col span={10}>
                        <InputNumber
                            onChange={(value: number | undefined | string | null) => {
                                if (typeof value === 'undefined' || value === null) {
                                    onChangePoints(undefined);
                                } else {
                                    onChangePoints(Math.floor(clamp(+value, minimumPoints, Number.MAX_SAFE_INTEGER)));
                                }
                            }}
                            className='cvat-draw-shape-popover-points-selector'
                            min={minimumPoints}
                            value={numberOfPoints}
                            step={1}
                        />
                    </Col>
                </Row>
            ) : null}
            <Row justify='space-around'>
                <Col span={24}>
                    <CVATTooltip title={`Press ${repeatShapeShortcut} to draw again`}>
                        <Button className={`cvat-draw-${shapeType}-shape-button`} onClick={onDrawShape}>Shape</Button>
                    </CVATTooltip>
                    {shapeType !== ShapeType.MASK && (
                        <CVATTooltip title={`Press ${repeatShapeShortcut} to draw again`}>
                            <Button
                                className={`cvat-draw-${shapeType}-track-button`}
                                onClick={onDrawTrack}
                            >
                                Track
                            </Button>
                        </CVATTooltip>
                    )}
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(DrawShapePopoverComponent);
