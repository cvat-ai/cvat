import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from '../../../canvas';

import ControlsSideBarComponent from '../../../components/annotation-page/standard-workspace/controls-side-bar';
import {
    ActiveControl,
    CombinedState,
} from '../../../reducers/interfaces';


interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControls: ActiveControl[];
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation,
        settings,
    } = state;

    const {
        canvasInstance,
        activeControls,
    } = annotation;

    return {
        rotateAll: settings.player.rotateAll,
        canvasInstance,
        activeControls,
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
