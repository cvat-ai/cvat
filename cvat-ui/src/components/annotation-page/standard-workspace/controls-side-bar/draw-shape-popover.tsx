import React from 'react';

import {
    Row,
    Col,
    Select,
    Button,
    InputNumber,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import {
    ShapeType,
    StringObject,
} from 'reducers/interfaces';

interface Props {
    shapeType: ShapeType;
    labels: StringObject;
    minimumPoints: number;
    numberOfPoints?: number;
    selectedLabeID: number;
    onChangeLabel(value: string): void;
    onChangePoints(value: number | undefined): void;
    onDrawTrack(): void;
    onDrawShape(): void;
}

const DrawShapePopoverComponent = React.memo((props: Props): JSX.Element => {
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
                            Object.keys(labels).map((key: string) => (
                                <Select.Option
                                    key={key}
                                    value={key}
                                >
                                    {labels[+key]}
                                </Select.Option>
                            ))
                        }
                    </Select>
                </Col>
            </Row>
            {
                shapeType !== ShapeType.RECTANGLE && (
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
});

export default DrawShapePopoverComponent;
