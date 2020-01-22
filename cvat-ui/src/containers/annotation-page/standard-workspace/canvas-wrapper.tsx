import React from 'react';
import { connect } from 'react-redux';

import CanvasWrapperComponent from 'components/annotation-page/standard-workspace/canvas-wrapper';

import {
    confirmCanvasReady,
    dragCanvas,
    zoomCanvas,
    resetCanvas,
    shapeDrawn,
    annotationsUpdated,
    mergeObjects,
    groupObjects,
    splitTrack,
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
    onMergeObjects: (enabled: boolean) => void;
    onGroupObjects: (enabled: boolean) => void;
    onSplitTrack: (enabled: boolean) => void;
    onAnnotationsUpdated: (annotations: any[]) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
            },
            drawing: {
                activeLabelID,
                activeObjectType,
            },
            job: {
                instance: jobInstance,
            },
            player: {
                frame: {
                    data: frameData,
                    number: frame,
                },
            },
            annotations: {
                states: annotations,
            },
        },
        settings: {
            player: {
                grid,
                gridSize,
                gridColor,
                gridOpacity,
            },
        },
    } = state;

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
        onMergeObjects(enabled: boolean): void {
            dispatch(mergeObjects(enabled));
        },
        onGroupObjects(enabled: boolean): void {
            dispatch(groupObjects(enabled));
        },
        onSplitTrack(enabled: boolean): void {
            dispatch(splitTrack(enabled));
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
