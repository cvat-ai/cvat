import React from 'react';
import { connect } from 'react-redux';

import {
    changeFrameAsync,
    switchPlay as switchPlayAction,
} from '../../../actions/annotation-actions';

import AnnotationTopBarComponent from '../../../components/annotation-page/top-bar/top-bar';
import { CombinedState } from '../../../reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frame: number;
    frameStep: number;
    playing: boolean;
    canvasIsReady: boolean;
}

interface DispatchToProps {
    onChangeFrame(frame: number, playing: boolean): void;
    onSwitchPlay(playing: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation,
        settings,
    } = state;

    return {
        jobInstance: annotation.jobInstance,
        frame: annotation.frame as number, // is number when jobInstance specified
        frameStep: settings.player.frameStep,
        playing: annotation.playing,
        canvasIsReady: annotation.canvasIsReady,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangeFrame(frame: number, playing: boolean): void {
            dispatch(changeFrameAsync(frame, playing));
        },
        onSwitchPlay(playing: boolean): void {
            dispatch(switchPlayAction(playing));
        },
    };
}

function AnnotationTopBarContainer(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        jobInstance,
        frame,
        frameStep,
        playing,
        canvasIsReady,
        onChangeFrame,
        onSwitchPlay,
    } = props;

    return (
        <AnnotationTopBarComponent
            jobInstance={jobInstance}
            frame={frame}
            frameStep={frameStep}
            playing={playing}
            canvasIsReady={canvasIsReady}
            onChangeFrame={onChangeFrame}
            onSwitchPlay={onSwitchPlay}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AnnotationTopBarContainer);
