import React from 'react';
import { connect } from 'react-redux';

import { rotateCurrentFrame } from 'actions/annotation-actions';

import RotateControlComponent from 'components/annotation-page/standard-workspace/controls-side-bar/rotate-control';

import {
    Rotation,
} from 'cvat-canvas';

interface DispatchToProps {
    rotateFrame(angle: Rotation): void;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        rotateFrame(angle: Rotation): void {
            dispatch(rotateCurrentFrame(angle));
        },
    };
}

class RotateControlContainer extends React.PureComponent<DispatchToProps> {
    public render(): JSX.Element {
        return (
            <RotateControlComponent {...this.props} />
        );
    }
}

export default connect(
    null,
    mapDispatchToProps,
)(RotateControlContainer);
