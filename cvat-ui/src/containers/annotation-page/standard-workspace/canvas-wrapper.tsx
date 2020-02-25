import React from 'react';
import { connect } from 'react-redux';

import CanvasWrapperComponent from 'components/annotation-page/standard-workspace/canvas-wrapper';

import {
    confirmCanvasReady,
    dragCanvas,
    zoomCanvas,
    resetCanvas,
    shapeDrawn,
    mergeObjects,
    groupObjects,
    splitTrack,
    editShape,
    updateAnnotationsAsync,
    createAnnotationsAsync,
    mergeAnnotationsAsync,
    groupAnnotationsAsync,
    splitAnnotationsAsync,
    activateObject,
    selectObjects,
    updateCanvasContextMenu,
    addZLayer,
    switchZLayer,
} from 'actions/annotation-actions';
import {
    ColorBy,
    GridColor,
    ObjectType,
    CombinedState,
} from 'reducers/interfaces';

import { Canvas } from 'cvat-canvas';

interface StateToProps {
    sidebarCollapsed: boolean;
    canvasInstance: Canvas;
    jobInstance: any;
    activatedStateID: number | null;
    selectedStatesID: number[];
    annotations: any[];
    frameData: any;
    frame: number;
    opacity: number;
    colorBy: ColorBy;
    selectedOpacity: number;
    blackBorders: boolean;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    activeLabelID: number;
    activeObjectType: ObjectType;
    minZLayer: number;
    maxZLayer: number;
    curZLayer: number;
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
    onEditShape: (enabled: boolean) => void;
    onUpdateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onSplitAnnotations(sessionInstance: any, frame: number, state: any): void;
    onActivateObject: (activatedStateID: number | null) => void;
    onSelectObjects: (selectedStatesID: number[]) => void;
    onUpdateContextMenu(visible: boolean, left: number, top: number): void;
    onAddZLayer(): void;
    onSwitchZLayer(cur: number): void;
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
                activatedStateID,
                selectedStatesID,
                zLayer: {
                    cur: curZLayer,
                    min: minZLayer,
                    max: maxZLayer,
                },
            },
            sidebarCollapsed,
        },
        settings: {
            player: {
                grid,
                gridSize,
                gridColor,
                gridOpacity,
            },
            shapes: {
                opacity,
                colorBy,
                selectedOpacity,
                blackBorders,
            },
        },
    } = state;

    return {
        sidebarCollapsed,
        canvasInstance,
        jobInstance,
        frameData,
        frame,
        activatedStateID,
        selectedStatesID,
        annotations,
        opacity,
        colorBy,
        selectedOpacity,
        blackBorders,
        grid,
        gridSize,
        gridColor,
        gridOpacity,
        activeLabelID,
        activeObjectType,
        curZLayer,
        minZLayer,
        maxZLayer,
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
        onEditShape(enabled: boolean): void {
            dispatch(editShape(enabled));
        },
        onUpdateAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(updateAnnotationsAsync(sessionInstance, frame, states));
        },
        onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(createAnnotationsAsync(sessionInstance, frame, states));
        },
        onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(mergeAnnotationsAsync(sessionInstance, frame, states));
        },
        onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(groupAnnotationsAsync(sessionInstance, frame, states));
        },
        onSplitAnnotations(sessionInstance: any, frame: number, state: any): void {
            dispatch(splitAnnotationsAsync(sessionInstance, frame, state));
        },
        onActivateObject(activatedStateID: number | null): void {
            if (activatedStateID === null) {
                dispatch(updateCanvasContextMenu(false, 0, 0));
            }

            dispatch(activateObject(activatedStateID));
        },
        onSelectObjects(selectedStatesID: number[]): void {
            dispatch(selectObjects(selectedStatesID));
        },
        onUpdateContextMenu(visible: boolean, left: number, top: number): void {
            dispatch(updateCanvasContextMenu(visible, left, top));
        },
        onAddZLayer(): void {
            dispatch(addZLayer());
        },
        onSwitchZLayer(cur: number): void {
            dispatch(switchZLayer(cur));
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
