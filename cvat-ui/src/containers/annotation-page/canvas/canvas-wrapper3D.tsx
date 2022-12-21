// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import CanvasWrapperComponent from 'components/annotation-page/canvas/canvas-wrapper3D';
import {
    activateObject,
    confirmCanvasReady,
    createAnnotationsAsync,
    dragCanvas,
    editShape,
    groupAnnotationsAsync,
    groupObjects,
    resetCanvas,
    shapeDrawn,
    updateAnnotationsAsync,
    updateCanvasContextMenu,
} from 'actions/annotation-actions';

import {
    ColorBy,
    CombinedState,
    ContextMenuType,
    ObjectType,
    Workspace,
} from 'reducers';

import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';

interface StateToProps {
    opacity: number;
    selectedOpacity: number;
    outlined: boolean;
    outlineColor: string;
    colorBy: ColorBy;
    frameFetching: boolean;
    canvasInstance: Canvas3d | Canvas;
    jobInstance: any;
    frameData: any;
    annotations: any[];
    contextMenuVisibility: boolean;
    activeLabelID: number;
    activatedStateID: number | null;
    activeObjectType: ObjectType;
    workspace: Workspace;
    frame: number;
    resetZoom: boolean;
}

interface DispatchToProps {
    onDragCanvas: (enabled: boolean) => void;
    onSetupCanvas(): void;
    onGroupObjects: (enabled: boolean) => void;
    onResetCanvas(): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onUpdateAnnotations(states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onActivateObject: (activatedStateID: number | null) => void;
    onShapeDrawn: () => void;
    onEditShape: (enabled: boolean) => void;
    onUpdateContextMenu(visible: boolean, left: number, top: number, type: ContextMenuType, pointID?: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
                contextMenu: { visible: contextMenuVisibility },
            },
            drawing: { activeLabelID, activeObjectType },
            job: { instance: jobInstance },
            player: {
                frame: { data: frameData, number: frame, fetching: frameFetching },
            },
            annotations: {
                states: annotations,
                activatedStateID,
            },
            workspace,
        },
        settings: {
            player: {
                resetZoom,
            },
            shapes: {
                opacity, colorBy, selectedOpacity, outlined, outlineColor,
            },
        },
    } = state;

    return {
        canvasInstance,
        jobInstance,
        frameData,
        contextMenuVisibility,
        annotations,
        frameFetching,
        frame,
        opacity,
        colorBy,
        selectedOpacity,
        outlined,
        outlineColor,
        activeLabelID,
        activatedStateID,
        activeObjectType,
        resetZoom,
        workspace,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDragCanvas(enabled: boolean): void {
            dispatch(dragCanvas(enabled));
        },
        onSetupCanvas(): void {
            dispatch(confirmCanvasReady());
        },
        onResetCanvas(): void {
            dispatch(resetCanvas());
        },
        onGroupObjects(enabled: boolean): void {
            dispatch(groupObjects(enabled));
        },
        onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(createAnnotationsAsync(sessionInstance, frame, states));
        },
        onShapeDrawn(): void {
            dispatch(shapeDrawn());
        },
        onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(groupAnnotationsAsync(sessionInstance, frame, states));
        },
        onActivateObject(activatedStateID: number | null): void {
            if (activatedStateID === null) {
                dispatch(updateCanvasContextMenu(false, 0, 0));
            }

            dispatch(activateObject(activatedStateID, null, null));
        },
        onEditShape(enabled: boolean): void {
            dispatch(editShape(enabled));
        },
        onUpdateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        onUpdateContextMenu(
            visible: boolean,
            left: number,
            top: number,
            type: ContextMenuType,
            pointID?: number,
        ): void {
            dispatch(updateCanvasContextMenu(visible, left, top, pointID, type));
        },
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasWrapperComponent);
