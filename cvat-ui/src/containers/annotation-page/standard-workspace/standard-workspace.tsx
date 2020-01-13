import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from '../../../canvas';

import StandardWorkspaceComponent from '../../../components/annotation-page/standard-workspace/standard-workspace';
import { CombinedState } from '../../../reducers/interfaces';


interface StateToProps {
    canvasInstance: Canvas;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { annotation } = state;
    return {
        canvasInstance: annotation.canvasInstance,
    };
}

function StandardWorkspaceContainer(props: StateToProps): JSX.Element {
    const {
        canvasInstance,
    } = props;

    return (
        <StandardWorkspaceComponent
            canvasInstance={canvasInstance}
        />
    );
}

export default connect(
    mapStateToProps,
)(StandardWorkspaceContainer);
