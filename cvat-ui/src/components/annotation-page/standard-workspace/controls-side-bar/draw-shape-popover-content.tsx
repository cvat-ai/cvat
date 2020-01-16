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
    ObjectType,
} from 'reducers/interfaces';

import {
    Canvas,
} from 'cvat-canvas';

interface Props {
    canvasInstance: Canvas;
    shapeType: ShapeType;
    labels: {
        [index: number]: string;
    };
    onDrawStart(
        shapeType: ShapeType,
        labelID: number,
        objectType: ObjectType,
        points?: number,
    ): void;
}

interface State {
    numberOfPoints?: number;
    selectedLabeID: number;
}

export default class DrawShapePopoverContent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        const defaultLabelID = +Object.keys(props.labels)[0];
        this.state = {
            selectedLabeID: defaultLabelID,
        };
    }

    public render(): JSX.Element {
        const {
            numberOfPoints,
            selectedLabeID,
        } = this.state;

        const {
            shapeType,
            labels,
            onDrawStart,
            canvasInstance,
        } = this.props;

        let minimumPoints = 0;
        if (shapeType === ShapeType.POLYGON) {
            minimumPoints = 3;
        } else if (shapeType === ShapeType.POLYLINE) {
            minimumPoints = 2;
        } else if (shapeType === ShapeType.POINTS) {
            minimumPoints = 1;
        }

        return (
            <div className='cvat-draw-shape-popover-content'>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text-color' strong>{`Create new ${shapeType}`}</Text>
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
                            value={labels[selectedLabeID]}
                            onChange={(value: string): void => {
                                this.setState({
                                    selectedLabeID: +value,
                                });
                            }}
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
                                    onChange={(value: number | undefined): void => {
                                        this.setState({
                                            numberOfPoints: value,
                                        });
                                    }}
                                    className='cvat-draw-shape-popover-points-selector'
                                    min={minimumPoints}
                                    step={1}
                                />
                            </Col>
                        </Row>
                    )
                }
                <Row type='flex' justify='space-around'>
                    <Col span={12}>
                        <Button
                            onClick={(): void => {
                                canvasInstance.cancel();
                                canvasInstance.draw({
                                    enabled: true,
                                    numberOfPoints,
                                    shapeType,
                                    crosshair: shapeType === ShapeType.RECTANGLE,
                                });

                                onDrawStart(shapeType, selectedLabeID,
                                    ObjectType.SHAPE, numberOfPoints);
                            }}
                        >
                            Shape
                        </Button>
                    </Col>
                    <Col span={12}>
                        <Button
                            onClick={(): void => {
                                canvasInstance.cancel();
                                canvasInstance.draw({
                                    enabled: true,
                                    numberOfPoints,
                                    shapeType,
                                    crosshair: shapeType === ShapeType.RECTANGLE,
                                });

                                onDrawStart(shapeType, selectedLabeID,
                                    ObjectType.TRACK, numberOfPoints);
                            }}
                        >
                            Track
                        </Button>
                    </Col>
                </Row>
            </div>
        );
    }
}
