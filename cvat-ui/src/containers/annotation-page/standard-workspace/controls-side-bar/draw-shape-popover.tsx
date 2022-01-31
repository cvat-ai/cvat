// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { RadioChangeEvent } from 'antd/lib/radio';

import { CombinedState, ShapeType, ObjectType } from 'reducers/interfaces';
import { rememberObject } from 'actions/annotation-actions';
import { Canvas, RectDrawingMethod, CuboidDrawingMethod } from 'cvat-canvas-wrapper';
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
        cuboidDrawingMethod?: CuboidDrawingMethod,
    ): void;
}

interface StateToProps {
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas;
    shapeType: ShapeType;
    labels: any[];
    jobInstance: any;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDrawStart(
            shapeType: ShapeType,
            labelID: number,
            objectType: ObjectType,
            points?: number,
            rectDrawingMethod?: RectDrawingMethod,
            cuboidDrawingMethod?: CuboidDrawingMethod,
        ): void {
            dispatch(
                rememberObject({
                    activeObjectType: objectType,
                    activeShapeType: shapeType,
                    activeLabelID: labelID,
                    activeNumOfPoints: points,
                    activeRectDrawingMethod: rectDrawingMethod,
                    activeCuboidDrawingMethod: cuboidDrawingMethod,
                }),
            );
        },
    };
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            canvas: { instance: canvasInstance },
            job: { labels, instance: jobInstance },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        ...own,
        canvasInstance: canvasInstance as Canvas,
        labels,
        normalizedKeyMap,
        jobInstance,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    rectDrawingMethod?: RectDrawingMethod;
    cuboidDrawingMethod?: CuboidDrawingMethod;
    numberOfPoints?: number;
    selectedLabelID: number;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    private minimumPoints = 3;

    constructor(props: Props) {
        super(props);

        const { shapeType } = props;
        const defaultLabelID = props.labels.length ? props.labels[0].id : null;
        const defaultRectDrawingMethod = RectDrawingMethod.CLASSIC;
        const defaultCuboidDrawingMethod = CuboidDrawingMethod.CLASSIC;
        this.state = {
            selectedLabelID: defaultLabelID,
            rectDrawingMethod: shapeType === ShapeType.RECTANGLE ? defaultRectDrawingMethod : undefined,
            cuboidDrawingMethod: shapeType === ShapeType.CUBOID ? defaultCuboidDrawingMethod : undefined,
        };

        if (shapeType === ShapeType.POLYGON) {
            this.minimumPoints = 3;
        } else if (shapeType === ShapeType.POLYLINE) {
            this.minimumPoints = 2;
        } else if (shapeType === ShapeType.POINTS) {
            this.minimumPoints = 1;
        }
    }

    private onDraw(objectType: ObjectType): void {
        const { canvasInstance, shapeType, onDrawStart } = this.props;

        const {
            rectDrawingMethod, cuboidDrawingMethod, numberOfPoints, selectedLabelID,
        } = this.state;

        canvasInstance.cancel();
        canvasInstance.draw({
            enabled: true,
            rectDrawingMethod,
            cuboidDrawingMethod,
            numberOfPoints,
            shapeType,
            crosshair: [ShapeType.RECTANGLE, ShapeType.CUBOID, ShapeType.ELLIPSE].includes(shapeType),
        });

        onDrawStart(shapeType, selectedLabelID, objectType, numberOfPoints, rectDrawingMethod, cuboidDrawingMethod);
    }

    private onChangeRectDrawingMethod = (event: RadioChangeEvent): void => {
        this.setState({
            rectDrawingMethod: event.target.value,
        });
    };

    private onChangeCuboidDrawingMethod = (event: RadioChangeEvent): void => {
        this.setState({
            cuboidDrawingMethod: event.target.value,
        });
    };

    private onDrawShape = (): void => {
        this.onDraw(ObjectType.SHAPE);
    };

    private onDrawTrack = (): void => {
        this.onDraw(ObjectType.TRACK);
    };

    private onChangePoints = (value: number | undefined): void => {
        this.setState({
            numberOfPoints: value,
        });
    };

    private onChangeLabel = (value: any): void => {
        this.setState({
            selectedLabelID: value.id,
        });
    };

    public render(): JSX.Element {
        const {
            rectDrawingMethod, cuboidDrawingMethod, selectedLabelID, numberOfPoints,
        } = this.state;

        const {
            normalizedKeyMap, labels, shapeType, jobInstance,
        } = this.props;

        return (
            <DrawShapePopoverComponent
                jobInstance={jobInstance}
                labels={labels}
                shapeType={shapeType}
                minimumPoints={this.minimumPoints}
                selectedLabelID={selectedLabelID}
                numberOfPoints={numberOfPoints}
                rectDrawingMethod={rectDrawingMethod}
                cuboidDrawingMethod={cuboidDrawingMethod}
                repeatShapeShortcut={normalizedKeyMap.SWITCH_DRAW_MODE}
                onChangeLabel={this.onChangeLabel}
                onChangePoints={this.onChangePoints}
                onChangeRectDrawingMethod={this.onChangeRectDrawingMethod}
                onChangeCuboidDrawingMethod={this.onChangeCuboidDrawingMethod}
                onDrawTrack={this.onDrawTrack}
                onDrawShape={this.onDrawShape}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DrawShapePopoverContainer);
