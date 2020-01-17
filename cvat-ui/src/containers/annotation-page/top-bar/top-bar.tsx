import React from 'react';
import { connect } from 'react-redux';

import {
    changeFrameAsync,
    switchPlay as switchPlayAction,
    saveAnnotationsAsync,
} from 'actions/annotation-actions';

import AnnotationTopBarComponent from 'components/annotation-page/top-bar/top-bar';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frame: number;
    frameStep: number;
    playing: boolean;
    canvasIsReady: boolean;
    saving: boolean;
    savingStatuses: string[];
}

interface DispatchToProps {
    onChangeFrame(frame: number, playing: boolean): void;
    onSwitchPlay(playing: boolean): void;
    onSaveAnnotation(sessionInstance: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation,
        settings,
    } = state;

    const {
        playing,
        saving,
        savingStatuses,
        canvasIsReady,
        frame,
        jobInstance,
    } = annotation;

    return {
        frameStep: settings.player.frameStep,
        playing,
        saving,
        savingStatuses,
        canvasIsReady,
        frame,
        jobInstance,
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
        onSaveAnnotation(sessionInstance: any): void {
            dispatch(saveAnnotationsAsync(sessionInstance));
        },
    };
}

function AnnotationTopBarContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <AnnotationTopBarComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AnnotationTopBarContainer);
