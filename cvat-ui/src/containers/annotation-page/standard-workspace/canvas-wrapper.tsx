import React from 'react';
import { connect } from 'react-redux';

import CanvasWrapperComponent from '../../../components/annotation-page/standard-workspace/canvas-wrapper';

import {
    confirmCanvasReady,
    dragCanvas,
    zoomCanvas,
    resetCanvas,
} from '../../../actions/annotation-actions';
import {
    GridColor,
    CombinedState,
} from '../../../reducers/interfaces';

import { Canvas } from '../../../canvas';

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
}

interface DispatchToProps {
    onSetupCanvas(): void;
    onDragCanvas: (enabled: boolean) => void;
    onZoomCanvas: (enabled: boolean) => void;
    onResetCanvas: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        canvasInstance,
        jobInstance,
        frameData,
        frame,
        annotations,
    } = state.annotation;

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
