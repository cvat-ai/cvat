import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from '../../../canvas';

import ControlsSideBarComponent from '../../../components/annotation-page/standard-workspace/controls-side-bar';
import { CombinedState } from '../../../reducers/interfaces';


interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation,
        settings,
    } = state;

    return {
        rotateAll: settings.player.rotateAll,
        canvasInstance: annotation.canvasInstance,
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
