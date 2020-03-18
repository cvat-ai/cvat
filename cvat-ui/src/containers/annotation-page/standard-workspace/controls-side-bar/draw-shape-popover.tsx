// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { RadioChangeEvent } from 'antd/lib/radio';

import {
    CombinedState,
    ShapeType,
    ObjectType,
} from 'reducers/interfaces';

import {
    rememberObject,
} from 'actions/annotation-actions';
import { Canvas, RectDrawingMethod } from 'cvat-canvas';
import DrawShapePopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';

interface OwnProps {
    shapeType: ShapeType;
}

interface DispatchToProps {
    onDrawStart(
        shapeType: ShapeType,
        labelID: number,
        objectType: ObjectType,
        points?: number,
        rectDrawingMethod?: RectDrawingMethod,
    ): void;
}

interface StateToProps {
    canvasInstance: Canvas;
    shapeType: ShapeType;
    labels: any[];
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDrawStart(
            shapeType: ShapeType,
            labelID: number,
            objectType: ObjectType,
            points?: number,
            rectDrawingMethod?: RectDrawingMethod,
        ): void {
            dispatch(rememberObject(objectType, labelID, shapeType, points, rectDrawingMethod));
        },
    };
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
            },
            job: {
                labels,
            },
        },
    } = state;

    return {
        ...own,
        canvasInstance,
        labels,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    rectDrawingMethod?: RectDrawingMethod;
    numberOfPoints?: number;
    selectedLabelID: number;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    private minimumPoints = 3;
    constructor(props: Props) {
        super(props);

        const { shapeType } = props;
        const defaultLabelID = props.labels[0].id;
        const defaultRectDrawingMethod = RectDrawingMethod.CLASSIC;
        this.state = {
            selectedLabelID: defaultLabelID,
            rectDrawingMethod: shapeType === ShapeType.RECTANGLE
                ? defaultRectDrawingMethod : undefined,
        };

        if (shapeType === ShapeType.POLYGON) {
            this.minimumPoints = 3;
        }
        if (shapeType === ShapeType.POLYLINE) {
            this.minimumPoints = 2;
        }
        if (shapeType === ShapeType.POINTS) {
            this.minimumPoints = 1;
        }
    }

    private onDraw(objectType: ObjectType): void {
        const {
            canvasInstance,
            shapeType,
            onDrawStart,
        } = this.props;

        const {
            rectDrawingMethod,
            numberOfPoints,
            selectedLabelID,
        } = this.state;

        canvasInstance.cancel();
        canvasInstance.draw({
            enabled: true,
            rectDrawingMethod,
            numberOfPoints,
            shapeType,
            crosshair: shapeType === ShapeType.RECTANGLE,
        });

        onDrawStart(shapeType, selectedLabelID,
            objectType, numberOfPoints, rectDrawingMethod);
    }

    private onChangeRectDrawingMethod = (event: RadioChangeEvent): void => {
        this.setState({
            rectDrawingMethod: event.target.value,
        });
    };

    private onDrawShape = (): void => {
        this.onDraw(ObjectType.SHAPE);
    };

    private onDrawTrack = (): void => {
        this.onDraw(ObjectType.TRACK);
    };

    private onChangePoints = (value: number | undefined): void => {
        if (typeof (value) === 'undefined') {
            this.setState({
                numberOfPoints: value,
            });
        } else if (typeof (value) === 'number') {
            this.setState({
                numberOfPoints: Math.max(value, this.minimumPoints),
            });
        }
    };

    private onChangeLabel = (value: string): void => {
        this.setState({
            selectedLabelID: +value,
        });
    };

    public render(): JSX.Element {
        const {
            rectDrawingMethod,
            selectedLabelID,
            numberOfPoints,
        } = this.state;

        const {
            labels,
            shapeType,
        } = this.props;

        return (
            <DrawShapePopoverComponent
                labels={labels}
                shapeType={shapeType}
                minimumPoints={this.minimumPoints}
                selectedLabeID={selectedLabelID}
                numberOfPoints={numberOfPoints}
                rectDrawingMethod={rectDrawingMethod}
                onChangeLabel={this.onChangeLabel}
                onChangePoints={this.onChangePoints}
                onChangeRectDrawingMethod={this.onChangeRectDrawingMethod}
                onDrawTrack={this.onDrawTrack}
                onDrawShape={this.onDrawShape}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DrawShapePopoverContainer);
