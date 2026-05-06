// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { RadioChangeEvent } from 'antd/lib/radio';

import { CombinedState } from 'reducers';
import { rememberObject } from 'actions/annotation-actions';
import { Canvas, RectDrawingMethod, CuboidDrawingMethod } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import DrawShapePopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';
import {
    Label, ObjectType, ShapeType, LabelType,
} from 'cvat-core-wrapper';

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
        simplifyPoly?: boolean,
    ): void;
}

interface StateToProps {
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas | Canvas3d;
    shapeType: ShapeType;
    labels: any[];
    jobInstance: any;
    activeSimplifyPoly?: boolean;
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
            simplifyPoly?: boolean,
        ): void {
            dispatch(
                rememberObject({
                    activeObjectType: objectType,
                    activeShapeType: shapeType,
                    activeLabelID: labelID,
                    activeNumOfPoints: points,
                    activeRectDrawingMethod: rectDrawingMethod,
                    activeCuboidDrawingMethod: cuboidDrawingMethod,
                    activeSimplifyPoly: simplifyPoly,
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
            drawing: { activeSimplifyPoly },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        ...own,
        canvasInstance: canvasInstance as Canvas,
        labels,
        normalizedKeyMap,
        jobInstance,
        activeSimplifyPoly,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    rectDrawingMethod?: RectDrawingMethod;
    cuboidDrawingMethod?: CuboidDrawingMethod;
    numberOfPoints?: number;
    selectedLabelID: number | null;
    simplifyPoly: boolean;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    private minimumPoints = 3;
    private satisfiedLabels: Label[];

    private isPolyShape: boolean;

    constructor(props: Props) {
        super(props);

        const { shapeType, activeSimplifyPoly } = props;
        this.isPolyShape = [ShapeType.POLYGON, ShapeType.POLYLINE].includes(shapeType);
        this.satisfiedLabels = props.labels.filter((label: Label) => {
            if (shapeType === ShapeType.SKELETON) {
                return label.type === LabelType.SKELETON;
            }

            return ['any', shapeType].includes(label.type as string);
        });

        const defaultLabelID = this.satisfiedLabels.length ? this.satisfiedLabels[0].id as number : null;
        const defaultRectDrawingMethod = RectDrawingMethod.CLASSIC;
        const defaultCuboidDrawingMethod = CuboidDrawingMethod.CLASSIC;
        this.state = {
            selectedLabelID: defaultLabelID,
            rectDrawingMethod: shapeType === ShapeType.RECTANGLE ? defaultRectDrawingMethod : undefined,
            cuboidDrawingMethod: shapeType === ShapeType.CUBOID ? defaultCuboidDrawingMethod : undefined,
            simplifyPoly: activeSimplifyPoly || false,
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
        const {
            canvasInstance, shapeType, onDrawStart, labels,
        } = this.props;

        const {
            rectDrawingMethod, cuboidDrawingMethod, numberOfPoints, selectedLabelID, simplifyPoly,
        } = this.state;
        const effectiveSimplifyPoly = this.isPolyShape && typeof numberOfPoints !== 'undefined' ? false : simplifyPoly;

        canvasInstance.cancel();

        const selectedLabel = labels.find((label) => label.id === selectedLabelID);
        if (selectedLabel) {
            canvasInstance.draw({
                enabled: true,
                rectDrawingMethod,
                cuboidDrawingMethod,
                numberOfPoints,
                shapeType,
                simplifyPoly: effectiveSimplifyPoly,
                skeletonSVG: selectedLabel && selectedLabel.type === ShapeType.SKELETON ?
                    selectedLabel.structure.svg : undefined,
                crosshair: [ShapeType.RECTANGLE, ShapeType.CUBOID, ShapeType.ELLIPSE].includes(shapeType),
            });

            onDrawStart(
                shapeType,
                selectedLabel.id,
                objectType,
                numberOfPoints,
                rectDrawingMethod,
                cuboidDrawingMethod,
                effectiveSimplifyPoly,
            );
        }
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
        this.setState((prevState) => {
            const { simplifyPoly } = prevState;
            return {
                numberOfPoints: value,
                simplifyPoly: this.isPolyShape && typeof value !== 'undefined' ? false : simplifyPoly,
            };
        });
    };

    private onChangeLabel = (value: Label): void => {
        this.setState({ selectedLabelID: value.id as number });
    };

    private onChangeSimplifyPoly = (value: boolean): void => {
        const { numberOfPoints } = this.state;
        if (this.isPolyShape && typeof numberOfPoints !== 'undefined' && value) {
            return;
        }

        this.setState({ simplifyPoly: value });
    };

    public render(): JSX.Element {
        const { satisfiedLabels } = this;
        const { normalizedKeyMap, shapeType, jobInstance } = this.props;
        const {
            rectDrawingMethod, cuboidDrawingMethod, selectedLabelID, numberOfPoints, simplifyPoly,
        } = this.state;

        return (
            <DrawShapePopoverComponent
                jobInstance={jobInstance}
                labels={satisfiedLabels}
                shapeType={shapeType}
                minimumPoints={this.minimumPoints}
                selectedLabelID={selectedLabelID}
                numberOfPoints={numberOfPoints}
                rectDrawingMethod={rectDrawingMethod}
                cuboidDrawingMethod={cuboidDrawingMethod}
                simplifyPoly={simplifyPoly}
                repeatShapeShortcut={normalizedKeyMap.SWITCH_DRAW_MODE_STANDARD_CONTROLS}
                onChangeLabel={this.onChangeLabel}
                onChangePoints={this.onChangePoints}
                onChangeRectDrawingMethod={this.onChangeRectDrawingMethod}
                onChangeCuboidDrawingMethod={this.onChangeCuboidDrawingMethod}
                onChangeSimplifyPoly={this.onChangeSimplifyPoly}
                onDrawTrack={this.onDrawTrack}
                onDrawShape={this.onDrawShape}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DrawShapePopoverContainer);
