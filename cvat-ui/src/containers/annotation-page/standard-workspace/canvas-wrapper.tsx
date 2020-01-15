import React from 'react';
import { connect } from 'react-redux';

import CanvasWrapperComponent from '../../../components/annotation-page/standard-workspace/canvas-wrapper';

import {
    confirmCanvasReady,
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
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
}

interface DispatchToProps {
    onSetupCanvas(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        canvasInstance,
        jobInstance,
        frameData,
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
