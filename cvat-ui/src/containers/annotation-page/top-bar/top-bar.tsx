import React from 'react';
import { connect } from 'react-redux';

import { SliderValue } from 'antd/lib/slider';

import {
    changeFrameAsync,
    switchPlay,
    saveAnnotationsAsync,
    collectStatisticsAsync,
    showStatistics as showStatisticsAction,
    undoActionAsync,
    redoActionAsync,
} from 'actions/annotation-actions';

import AnnotationTopBarComponent from 'components/annotation-page/top-bar/top-bar';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: number;
    frameStep: number;
    playing: boolean;
    saving: boolean;
    canvasIsReady: boolean;
    savingStatuses: string[];
    undoAction?: string;
    redoAction?: string;
}

interface DispatchToProps {
    onChangeFrame(frame: number): void;
    onSwitchPlay(playing: boolean): void;
    onSaveAnnotation(sessionInstance: any): void;
    showStatistics(sessionInstance: any): void;
    undo(sessionInstance: any, frameNumber: any): void;
    redo(sessionInstance: any, frameNumber: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                playing,
                frame: {
                    number: frameNumber,
                },
            },
            annotations: {
                saving: {
                    uploading: saving,
                    statuses: savingStatuses,
                },
                history,
            },
            job: {
                instance: jobInstance,
            },
            canvas: {
                ready: canvasIsReady,
            },
        },
        settings: {
            player: {
                frameStep,
            },
        },
    } = state;

    return {
        frameStep,
        playing,
        canvasIsReady,
        saving,
        savingStatuses,
        frameNumber,
        jobInstance,
        undoAction: history.undo[history.undo.length - 1],
        redoAction: history.redo[history.redo.length - 1],
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        onSwitchPlay(playing: boolean): void {
            dispatch(switchPlay(playing));
        },
        onSaveAnnotation(sessionInstance: any): void {
            dispatch(saveAnnotationsAsync(sessionInstance));
        },
        showStatistics(sessionInstance: any): void {
            dispatch(collectStatisticsAsync(sessionInstance));
            dispatch(showStatisticsAction(true));
        },
        undo(sessionInstance: any, frameNumber: any): void {
            dispatch(undoActionAsync(sessionInstance, frameNumber));
        },
        redo(sessionInstance: any, frameNumber: any): void {
            dispatch(redoActionAsync(sessionInstance, frameNumber));
        },
    };
}

type Props = StateToProps & DispatchToProps;
class AnnotationTopBarContainer extends React.PureComponent<Props> {
    public componentDidUpdate(): void {
        const {
            jobInstance,
            frameNumber,
            playing,
            canvasIsReady,
            onChangeFrame,
            onSwitchPlay,
        } = this.props;

        if (playing && canvasIsReady) {
            if (frameNumber < jobInstance.stopFrame) {
                setTimeout(() => {
                    const { playing: stillPlaying } = this.props;
                    if (stillPlaying) {
                        onChangeFrame(frameNumber + 1);
                    }
                });
            } else {
                onSwitchPlay(false);
            }
        }
    }

    private undo = (): void => {
        const {
            undo,
            jobInstance,
            frameNumber,
        } = this.props;

        undo(jobInstance, frameNumber);
    };

    private redo = (): void => {
        const {
            redo,
            jobInstance,
            frameNumber,
        } = this.props;

        redo(jobInstance, frameNumber);
    };

    private showStatistics = (): void => {
        const {
            jobInstance,
            showStatistics,
        } = this.props;

        showStatistics(jobInstance);
    };

    private onSwitchPlay = (): void => {
        const {
            frameNumber,
            jobInstance,
            onSwitchPlay,
            playing,
        } = this.props;

        if (playing) {
            onSwitchPlay(false);
        } else if (frameNumber < jobInstance.stopFrame) {
            onSwitchPlay(true);
        }
    };

    private onFirstFrame = (): void => {
        const {
            onChangeFrame,
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = jobInstance.startFrame;
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(newFrame);
        }
    };

    private onBackward = (): void => {
        const {
            onChangeFrame,
            frameNumber,
            frameStep,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .max(jobInstance.startFrame, frameNumber - frameStep);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(newFrame);
        }
    };

    private onPrevFrame = (): void => {
        const {
            onChangeFrame,
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .max(jobInstance.startFrame, frameNumber - 1);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(newFrame);
        }
    };

    private onNextFrame = (): void => {
        const {
            onChangeFrame,
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .min(jobInstance.stopFrame, frameNumber + 1);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(newFrame);
        }
    };

    private onForward = (): void => {
        const {
            onChangeFrame,
            frameNumber,
            frameStep,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .min(jobInstance.stopFrame, frameNumber + frameStep);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(newFrame);
        }
    };

    private onLastFrame = (): void => {
        const {
            onChangeFrame,
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = jobInstance.stopFrame;
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(newFrame);
        }
    };

    private onSaveAnnotation = (): void => {
        const {
            onSaveAnnotation,
            jobInstance,
        } = this.props;

        onSaveAnnotation(jobInstance);
    };

    private onChangePlayerSliderValue = (value: SliderValue): void => {
        const {
            playing,
            onSwitchPlay,
            onChangeFrame,
        } = this.props;

        if (playing) {
            onSwitchPlay(false);
        }
        onChangeFrame(value as number);
    };

    private onChangePlayerInputValue = (value: number | undefined): void => {
        const {
            onSwitchPlay,
            playing,
            onChangeFrame,
        } = this.props;

        if (typeof (value) !== 'undefined') {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(value);
        }
    };

    public render(): JSX.Element {
        const {
            playing,
            saving,
            savingStatuses,
            jobInstance: {
                startFrame,
                stopFrame,
            },
            frameNumber,
            undoAction,
            redoAction,
        } = this.props;

        return (
            <AnnotationTopBarComponent
                showStatistics={this.showStatistics}
                onSwitchPlay={this.onSwitchPlay}
                onSaveAnnotation={this.onSaveAnnotation}
                onPrevFrame={this.onPrevFrame}
                onNextFrame={this.onNextFrame}
                onForward={this.onForward}
                onBackward={this.onBackward}
                onFirstFrame={this.onFirstFrame}
                onLastFrame={this.onLastFrame}
                onSliderChange={this.onChangePlayerSliderValue}
                onInputChange={this.onChangePlayerInputValue}
                playing={playing}
                saving={saving}
                savingStatuses={savingStatuses}
                startFrame={startFrame}
                stopFrame={stopFrame}
                frameNumber={frameNumber}
                undoAction={undoAction}
                redoAction={redoAction}
                onUndoClick={this.undo}
                onRedoClick={this.redo}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AnnotationTopBarContainer);
