import React from 'react';
import { connect } from 'react-redux';

import { Canvas } from 'cvat-canvas';

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
import { CombinedState, FrameSpeed } from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: number;
    frameStep: number;
    frameSpeed: FrameSpeed;
    frameChangeTime: number | null;
    playing: boolean;
    saving: boolean;
    canvasInstance: Canvas;
    canvasIsReady: boolean;
    savingStatuses: string[];
    undoAction?: string;
    redoAction?: string;
    resetZoom: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
}

interface DispatchToProps {
    onChangeFrame(frame: number, time: number | null): void;
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
                    changeTime: frameChangeTime,
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
                instance: canvasInstance,
                ready: canvasIsReady,
            },
        },
        settings: {
            player: {
                frameSpeed,
                frameStep,
                resetZoom,
            },
            workspace: {
                autoSave,
                autoSaveInterval,
            }
        },
    } = state;

    return {
        frameStep,
        frameSpeed,
        frameChangeTime,
        playing,
        canvasInstance,
        canvasIsReady,
        saving,
        savingStatuses,
        frameNumber,
        jobInstance,
        undoAction: history.undo[history.undo.length - 1],
        redoAction: history.redo[history.redo.length - 1],
        resetZoom,
        autoSave,
        autoSaveInterval,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangeFrame(frame: number, time: number | null): void {
            dispatch(changeFrameAsync(frame, time));
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
    private autoSaveInterval: number | undefined;
    private frameUpdateStartTime: number | undefined;

    public componentDidUpdate(): void {
        const {
            jobInstance,
            frameNumber,
            frameChangeTime,
            frameSpeed,
            playing,
            canvasIsReady,
            onSwitchPlay,
        } = this.props;

        
        if (playing && canvasIsReady) {
            if (frameNumber < jobInstance.stopFrame) {
                const delay: number = frameChangeTime ? Math.max(0,~~(1000/frameSpeed) -  new Date().getTime() + frameChangeTime) : 0;
                setTimeout(() => {
                    const { playing: stillPlaying } = this.props;
                    if (stillPlaying) {
                        this.onChangeFrame(frameNumber + 1, new Date().getTime());
                    }
                }, delay);
            } else {
                onSwitchPlay(false);
            }
        } 

    }

    componentDidMount(): void {
        const {
            autoSave, 
            autoSaveInterval,
            saving,
         } = this.props;

        this.autoSaveInterval = window.setInterval((autoSave: boolean, saving: boolean): void => {
            if (autoSave && !saving) {
                this.onSaveAnnotation();
            }
        }, autoSaveInterval, autoSave, saving);
    }

    public componentWillUnmount() : void {
        window.clearInterval(this.autoSaveInterval);
    }

    private onChangeFrame(newFrame: number, time: number | null = null): void {
        const { 
            canvasInstance,
            canvasIsReady,
            onChangeFrame,
            resetZoom,
        } = this.props;

        onChangeFrame(newFrame, time);

        if (canvasIsReady && resetZoom) {
            canvasInstance.fit();
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
            this.onChangeFrame(newFrame);
        }
    };

    private onBackward = (): void => {
        const {
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
            this.onChangeFrame(newFrame);
        }
    };

    private onPrevFrame = (): void => {
        const {
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
            this.onChangeFrame(newFrame);
        }
    };

    private onNextFrame = (): void => {
        const {
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
            this.onChangeFrame(newFrame);
        }
    };

    private onForward = (): void => {
        const {
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
            this.onChangeFrame(newFrame);
        }
    };

    private onLastFrame = (): void => {
        const {
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
            this.onChangeFrame(newFrame);
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
        } = this.props;

        if (playing) {
            onSwitchPlay(false);
        }
        this.onChangeFrame(value as number);
    };

    private onChangePlayerInputValue = (value: number | undefined): void => {
        const {
            onSwitchPlay,
            playing,
        } = this.props;

        if (typeof (value) !== 'undefined') {
            if (playing) {
                onSwitchPlay(false);
            }
            this.onChangeFrame(value);
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
