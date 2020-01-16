import React from 'react';
import { connect } from 'react-redux';

import CanvasWrapperComponent from 'components/annotation-page/standard-workspace/canvas-wrapper';

import {
    confirmCanvasReady,
    dragCanvas,
    zoomCanvas,
    resetCanvas,
    shapeDrawn,
    objectsMerged,
    objectsGroupped,
    trackSplitted,
    annotationsUpdated,
} from 'actions/annotation-actions';
import {
    GridColor,
    ObjectType,
    CombinedState,
} from 'reducers/interfaces';

import { Canvas } from 'cvat-canvas';

interface StateToProps {
    canvasInstance: Canvas;
    jobInstance: any;
    annotations: any[];
    frameData: any;
    frame: number;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    activeLabelID: number;
    activeObjectType: ObjectType;
}

interface DispatchToProps {
    onSetupCanvas(): void;
    onDragCanvas: (enabled: boolean) => void;
    onZoomCanvas: (enabled: boolean) => void;
    onResetCanvas: () => void;
    onShapeDrawn: () => void;
    onObjectsMerged: () => void;
    onObjectsGroupped: () => void;
    onTrackSplitted: () => void;
    onAnnotationsUpdated: (annotations: any[]) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        canvasInstance,
        jobInstance,
        frameData,
        frame,
        annotations,
        drawing,
    } = state.annotation;

    const {
        activeLabelID,
        activeObjectType,
    } = drawing;

    const {
        grid,
        gridSize,
        gridColor,
        gridOpacity,
    } = state.settings.player;

    return {
        canvasInstance,
        jobInstance,
        frameData,
        frame,
        annotations,
        grid,
        gridSize,
        gridColor,
        gridOpacity,
        activeLabelID,
        activeObjectType,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onSetupCanvas(): void {
            dispatch(confirmCanvasReady());
        },
        onDragCanvas(enabled: boolean): void {
            dispatch(dragCanvas(enabled));
        },
        onZoomCanvas(enabled: boolean): void {
            dispatch(zoomCanvas(enabled));
        },
        onResetCanvas(): void {
            dispatch(resetCanvas());
        },
        onShapeDrawn(): void {
            dispatch(shapeDrawn());
        },
        onObjectsMerged(): void {
            dispatch(objectsMerged());
        },
        onObjectsGroupped(): void {
            dispatch(objectsGroupped());
        },
        onTrackSplitted(): void {
            dispatch(trackSplitted());
        },
        onAnnotationsUpdated(annotations: any[]): void {
            dispatch(annotationsUpdated(annotations));
        },
    };
}

function CanvasWrapperContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <CanvasWrapperComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CanvasWrapperContainer);
