import React from 'react';
import { connect } from 'react-redux';

import {
    CombinedState,
    ShapeType,
    ObjectType,
    StringObject,
} from 'reducers/interfaces';

import {
    drawShape,
} from 'actions/annotation-actions';
import { Canvas } from 'cvat-canvas';
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
    ): void;
}

interface StateToProps {
    canvasInstance: Canvas;
    shapeType: ShapeType;
    labels: StringObject;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDrawStart(
            shapeType: ShapeType,
            labelID: number,
            objectType: ObjectType,
            points?: number,
        ): void {
            dispatch(drawShape(shapeType, labelID, objectType, points));
        },
    };
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation,
    } = state;

    const {
        canvasInstance,
    } = annotation;

    const labels = annotation.jobInstance.task.labels
        .reduce((acc: StringObject, label: any): StringObject => {
            acc[label.id as number] = label.name;
            return acc;
        }, {});

    return {
        ...own,
        canvasInstance,
        labels,
    };
}

function DrawShapePopoverContainer(props: DispatchToProps & StateToProps): JSX.Element {
    return (
        <DrawShapePopoverComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DrawShapePopoverContainer);
