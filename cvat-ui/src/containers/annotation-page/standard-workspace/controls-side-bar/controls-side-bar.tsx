import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from 'cvat-canvas';

import { drawShape } from 'actions/annotation-actions';
import ControlsSideBarComponent from 'components/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import {
    ActiveControl,
    CombinedState,
    ShapeType,
    ObjectType,
} from 'reducers/interfaces';

type StringObject = {
    [index: number]: string;
};

interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
    labels: StringObject;
}

interface DispatchToProps {
    onDrawStart(
        shapeType: ShapeType,
        labelID: number,
        objectType: ObjectType,
        points?: number,
    ): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation,
        settings,
    } = state;

    const {
        canvasInstance,
        activeControl,
    } = annotation;

    const labels = annotation.jobInstance.task.labels
        .reduce((acc: StringObject, label: any): StringObject => {
            acc[label.id as number] = label.name;
            return acc;
        }, {});

    return {
        rotateAll: settings.player.rotateAll,
        canvasInstance,
        activeControl,
        labels,
    };
}

function dispatchToProps(dispatch: any): DispatchToProps {
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

function StandardWorkspaceContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <ControlsSideBarComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    dispatchToProps,
)(StandardWorkspaceContainer);
