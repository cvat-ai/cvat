import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from '../../../../canvas';

import ControlsSideBarComponent from '../../../../components/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import {
    ActiveControl,
    CombinedState,
} from '../../../../reducers/interfaces';


interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
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

    return {
        rotateAll: settings.player.rotateAll,
        canvasInstance,
        activeControl,
    };
}

function StandardWorkspaceContainer(props: StateToProps): JSX.Element {
    return (
        <ControlsSideBarComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
)(StandardWorkspaceContainer);
