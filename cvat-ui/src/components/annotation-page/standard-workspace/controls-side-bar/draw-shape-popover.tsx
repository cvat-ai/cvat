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
    StringObject,
} from 'reducers/interfaces';

import {
    Canvas,
} from 'cvat-canvas';

interface Props {
    canvasInstance: Canvas;
    shapeType: ShapeType;
    labels: StringObject;

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

function defineMinimumPoints(shapeType: ShapeType): number {
    if (shapeType === ShapeType.POLYGON) {
        return 3;
    }
    if (shapeType === ShapeType.POLYLINE) {
        return 2;
    }
    if (shapeType === ShapeType.POINTS) {
        return 1;
    }
    return 0;
}

export default class DrawShapePopoverComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        const defaultLabelID = +Object.keys(props.labels)[0];
        this.state = {
            selectedLabeID: defaultLabelID,
        };
    }

    private onChangePoints = (value: number | undefined): void => {
        this.setState({
            numberOfPoints: value,
        });
    };

    private onChangeLabel = (value: string): void => {
        this.setState({
            selectedLabeID: +value,
        });
    };

    private onDrawTrackStart = (): void => {
        this.onDrawStart(ObjectType.TRACK);
    };

    private onDrawShapeStart = (): void => {
        this.onDrawStart(ObjectType.SHAPE);
    };

    private onDrawStart = (objectType: ObjectType): void => {
        const {
            numberOfPoints,
            selectedLabeID,
        } = this.state;

        const {
            shapeType,
            onDrawStart,
            canvasInstance,
        } = this.props;

        canvasInstance.cancel();
        canvasInstance.draw({
            enabled: true,
            numberOfPoints,
            shapeType,
            crosshair: shapeType === ShapeType.RECTANGLE,
        });

        onDrawStart(shapeType, selectedLabeID,
            objectType, numberOfPoints);
    };

    public render(): JSX.Element {
        const {
            selectedLabeID,
        } = this.state;

        const {
            shapeType,
            labels,
        } = this.props;

        const minimumPoints = defineMinimumPoints(shapeType);

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
                            value={labels[selectedLabeID]}
                            onChange={this.onChangeLabel}
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
                                    onChange={this.onChangePoints}
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
                            onClick={this.onDrawShapeStart}
                        >
                            Shape
                        </Button>
                    </Col>
                    <Col span={12}>
                        <Button
                            onClick={this.onDrawTrackStart}
                        >
                            Track
                        </Button>
                    </Col>
                </Row>
            </div>
        );
    }
}
