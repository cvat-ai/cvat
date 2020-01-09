import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from '../../../canvas';
import {
    confirmCanvasReady,
} from '../../../actions/annotation-actions';

import StandardWorkspaceComponent from '../../../components/annotation-page/standard-workspace/standard-workspace';
import { CombinedState } from '../../../reducers/interfaces';


interface StateToProps {
    canvasInstance: Canvas;
    jobInstance: any;
    frameData: any | null;
    annotations: any[];
}

interface DispatchToProps {
    onSetupCanvas(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { annotation } = state;
    return {
        canvasInstance: annotation.canvasInstance,
        jobInstance: annotation.jobInstance,
        frameData: annotation.frameData,
        annotations: annotation.annotations,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onSetupCanvas(): void {
            dispatch(confirmCanvasReady());
        },
    };
}

function StandardWorkspaceContainer(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        canvasInstance,
        jobInstance,
        frameData,
        annotations,
        onSetupCanvas,
    } = props;

    return (
        <StandardWorkspaceComponent
            canvasInstance={canvasInstance}
            jobInstance={jobInstance}
            annotations={annotations}
            frameData={frameData}
            onCanvasSetup={onSetupCanvas}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(StandardWorkspaceContainer);
