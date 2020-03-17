// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

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
    switchGrid,
    changeGridColor,
    changeGridOpacity,
    changeBrightnessLevel,
    changeContrastLevel,
    changeSaturationLevel,
} from 'actions/settings-actions';
import {
    ColorBy,
    GridColor,
    ObjectType,
    CombinedState,
    Workspace,
} from 'reducers/interfaces';

import { Canvas } from 'cvat-canvas';

interface StateToProps {
    sidebarCollapsed: boolean;
    canvasInstance: Canvas;
    jobInstance: any;
    activatedStateID: number | null;
    activatedAttributeID: number | null;
    selectedStatesID: number[];
    annotations: any[];
    frameData: any;
    frameAngle: number;
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
    brightnessLevel: number;
    contrastLevel: number;
    saturationLevel: number;
    resetZoom: boolean;
    aamZoomMargin: number;
    workspace: Workspace;
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
    onUpdateAnnotations(states: any[]): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onSplitAnnotations(sessionInstance: any, frame: number, state: any): void;
    onActivateObject: (activatedStateID: number | null) => void;
    onSelectObjects: (selectedStatesID: number[]) => void;
    onUpdateContextMenu(visible: boolean, left: number, top: number): void;
    onAddZLayer(): void;
    onSwitchZLayer(cur: number): void;
    onChangeBrightnessLevel(level: number): void;
    onChangeContrastLevel(level: number): void;
    onChangeSaturationLevel(level: number): void;
    onChangeGridOpacity(opacity: number): void;
    onChangeGridColor(color: GridColor): void;
    onSwitchGrid(enabled: boolean): void;
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
                frameAngles,
            },
            annotations: {
                states: annotations,
                activatedStateID,
                activatedAttributeID,
                selectedStatesID,
                zLayer: {
                    cur: curZLayer,
                    min: minZLayer,
                    max: maxZLayer,
                },
            },
            sidebarCollapsed,
            workspace,
        },
        settings: {
            player: {
                grid,
                gridSize,
                gridColor,
                gridOpacity,
                brightnessLevel,
                contrastLevel,
                saturationLevel,
                resetZoom,
            },
            workspace: {
                aamZoomMargin,
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
        frameAngle: frameAngles[frame - jobInstance.startFrame],
        frame,
        activatedStateID,
        activatedAttributeID,
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
        brightnessLevel,
        contrastLevel,
        saturationLevel,
        resetZoom,
        aamZoomMargin,
        curZLayer,
        minZLayer,
        maxZLayer,
        workspace,
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
        onUpdateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
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

            dispatch(activateObject(activatedStateID, null));
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
        onChangeBrightnessLevel(level: number): void {
            dispatch(changeBrightnessLevel(level));
        },
        onChangeContrastLevel(level: number): void {
            dispatch(changeContrastLevel(level));
        },
        onChangeSaturationLevel(level: number): void {
            dispatch(changeSaturationLevel(level));
        },
        onChangeGridOpacity(opacity: number): void {
            dispatch(changeGridOpacity(opacity));
        },
        onChangeGridColor(color: GridColor): void {
            dispatch(changeGridColor(color));
        },
        onSwitchGrid(enabled: boolean): void {
            dispatch(switchGrid(enabled));
        },
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CanvasWrapperComponent);
