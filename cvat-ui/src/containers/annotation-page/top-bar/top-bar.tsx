// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';

import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';

import { InputNumber } from 'antd';
import { SliderValue } from 'antd/lib/slider';

import {
    changeFrameAsync,
    switchPlay,
    saveAnnotationsAsync,
    collectStatisticsAsync,
    showStatistics as showStatisticsAction,
    undoActionAsync,
    redoActionAsync,
    searchAnnotationsAsync,
    changeWorkspace as changeWorkspaceAction,
    activateObject,
} from 'actions/annotation-actions';

import AnnotationTopBarComponent from 'components/annotation-page/top-bar/top-bar';
import { CombinedState, FrameSpeed, Workspace } from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: number;
    frameStep: number;
    frameSpeed: FrameSpeed;
    frameDelay: number;
    playing: boolean;
    saving: boolean;
    canvasIsReady: boolean;
    savingStatuses: string[];
    undoAction?: string;
    redoAction?: string;
    autoSave: boolean;
    autoSaveInterval: number;
    workspace: Workspace;
}

interface DispatchToProps {
    onChangeFrame(frame: number): void;
    onSwitchPlay(playing: boolean): void;
    onSaveAnnotation(sessionInstance: any): void;
    showStatistics(sessionInstance: any): void;
    undo(sessionInstance: any, frameNumber: any): void;
    redo(sessionInstance: any, frameNumber: any): void;
    searchAnnotations(sessionInstance: any, frameFrom: any, frameTo: any): void;
    changeWorkspace(workspace: Workspace): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                playing,
                frame: {
                    number: frameNumber,
                    delay: frameDelay,
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
            workspace,
        },
        settings: {
            player: {
                frameSpeed,
                frameStep,
            },
            workspace: {
                autoSave,
                autoSaveInterval,
            },
        },
    } = state;

    return {
        frameStep,
        frameSpeed,
        frameDelay,
        playing,
        canvasIsReady,
        saving,
        savingStatuses,
        frameNumber,
        jobInstance,
        undoAction: history.undo[history.undo.length - 1],
        redoAction: history.redo[history.redo.length - 1],
        autoSave,
        autoSaveInterval,
        workspace,
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
        searchAnnotations(sessionInstance: any, frameFrom: any, frameTo: any): void {
            dispatch(searchAnnotationsAsync(sessionInstance, frameFrom, frameTo));
        },
        changeWorkspace(workspace: Workspace): void {
            dispatch(activateObject(null, null));
            dispatch(changeWorkspaceAction(workspace));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;
class AnnotationTopBarContainer extends React.PureComponent<Props> {
    private inputFrameRef: React.RefObject<InputNumber>;
    private autoSaveInterval: number | undefined;
    private unblock: any;

    constructor(props: Props) {
        super(props);
        this.inputFrameRef = React.createRef<InputNumber>();
    }

    public componentDidMount(): void {
        const {
            autoSave,
            autoSaveInterval,
            saving,
            history,
            jobInstance,
        } = this.props;

        this.autoSaveInterval = window.setInterval((): void => {
            if (autoSave && !saving) {
                this.onSaveAnnotation();
            }
        }, autoSaveInterval);

        this.unblock = history.block((location: any) => {
            if (jobInstance.annotations.hasUnsavedChanges() && location.pathname !== '/settings'
                && location.pathname !== `/tasks/${jobInstance.task.id}/jobs/${jobInstance.id}`) {
                return 'You have unsaved changes, please confirm leaving this page.';
            }
            return undefined;
        });
        this.beforeUnloadCallback = this.beforeUnloadCallback.bind(this);
        window.addEventListener('beforeunload', this.beforeUnloadCallback);
    }

    public componentDidUpdate(): void {
        const {
            jobInstance,
            frameSpeed,
            frameNumber,
            frameDelay,
            playing,
            canvasIsReady,
            onSwitchPlay,
            onChangeFrame,
        } = this.props;


        if (playing && canvasIsReady) {
            if (frameNumber < jobInstance.stopFrame) {
                let framesSkiped = 0;
                if (frameSpeed === FrameSpeed.Fast
                    && (frameNumber + 1 < jobInstance.stopFrame)) {
                    framesSkiped = 1;
                }
                if (frameSpeed === FrameSpeed.Fastest
                    && (frameNumber + 2 < jobInstance.stopFrame)) {
                    framesSkiped = 2;
                }

                setTimeout(() => {
                    const { playing: stillPlaying } = this.props;
                    if (stillPlaying) {
                        onChangeFrame(frameNumber + 1 + framesSkiped);
                    }
                }, frameDelay);
            } else {
                onSwitchPlay(false);
            }
        }
    }

    public componentWillUnmount(): void {
        window.clearInterval(this.autoSaveInterval);
        window.removeEventListener('beforeunload', this.beforeUnloadCallback);
        this.unblock();
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
            onChangeFrame,
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
            frameNumber,
            frameStep,
            jobInstance,
            playing,
            onSwitchPlay,
            onChangeFrame,
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
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
            onChangeFrame,
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
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
            onChangeFrame,
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
            frameNumber,
            frameStep,
            jobInstance,
            playing,
            onSwitchPlay,
            onChangeFrame,
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
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
            onChangeFrame,
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
            onChangeFrame,
            playing,
        } = this.props;

        if (typeof (value) !== 'undefined') {
            if (playing) {
                onSwitchPlay(false);
            }
            onChangeFrame(value);
        }
    };

    private onURLIconClick = (): void => {
        const { frameNumber } = this.props;
        const {
            origin,
            pathname,
        } = window.location;
        const url = `${origin}${pathname}?frame=${frameNumber}`;
        copy(url);
    };

    private beforeUnloadCallback(event: BeforeUnloadEvent): any {
        const { jobInstance } = this.props;
        if (jobInstance.annotations.hasUnsavedChanges()) {
            const confirmationMessage = 'You have unsaved changes, please confirm leaving this page.';
            // eslint-disable-next-line no-param-reassign
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }
        return undefined;
    }

    public render(): JSX.Element {
        const {
            playing,
            saving,
            savingStatuses,
            jobInstance,
            jobInstance: {
                startFrame,
                stopFrame,
            },
            frameNumber,
            undoAction,
            redoAction,
            workspace,
            canvasIsReady,
            searchAnnotations,
            changeWorkspace,
        } = this.props;

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const keyMap = {
            SAVE_JOB: {
                name: 'Save the job',
                description: 'Send all changes of annotations to the server',
                sequence: 'ctrl+s',
                action: 'keydown',
            },
            UNDO: {
                name: 'Undo action',
                description: 'Cancel the latest action related with objects',
                sequence: 'ctrl+z',
                action: 'keydown',
            },
            REDO: {
                name: 'Redo action',
                description: 'Cancel undo action',
                sequences: ['ctrl+shift+z', 'ctrl+y'],
                action: 'keydown',
            },
            NEXT_FRAME: {
                name: 'Next frame',
                description: 'Go to the next frame',
                sequence: 'f',
                action: 'keydown',
            },
            PREV_FRAME: {
                name: 'Previous frame',
                description: 'Go to the previous frame',
                sequence: 'd',
                action: 'keydown',
            },
            FORWARD_FRAME: {
                name: 'Forward frame',
                description: 'Go forward with a step',
                sequence: 'v',
                action: 'keydown',
            },
            BACKWARD_FRAME: {
                name: 'Backward frame',
                description: 'Go backward with a step',
                sequence: 'c',
                action: 'keydown',
            },
            SEARCH_FORWARD: {
                name: 'Search forward',
                description: 'Search the next frame that satisfies to the filters',
                sequence: 'right',
                action: 'keydown',
            },
            SEARCH_BACKWARD: {
                name: 'Search backward',
                description: 'Search the previous frame that satisfies to the filters',
                sequence: 'left',
                action: 'keydown',
            },
            PLAY_PAUSE: {
                name: 'Play/pause',
                description: 'Start/stop automatic changing frames',
                sequence: 'space',
                action: 'keydown',
            },
            FOCUS_INPUT_FRAME: {
                name: 'Focus input frame',
                description: 'Focus on the element to change the current frame',
                sequences: ['`', '~'],
                action: 'keydown',
            },
        };

        const handlers = {
            UNDO: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (undoAction) {
                    this.undo();
                }
            },
            REDO: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (redoAction) {
                    this.redo();
                }
            },
            SAVE_JOB: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.onSaveAnnotation();
            },
            NEXT_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onNextFrame();
                }
            },
            PREV_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onPrevFrame();
                }
            },
            FORWARD_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onForward();
                }
            },
            BACKWARD_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onBackward();
                }
            },
            SEARCH_FORWARD: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (frameNumber + 1 <= stopFrame && canvasIsReady) {
                    searchAnnotations(jobInstance, frameNumber + 1, stopFrame);
                }
            },
            SEARCH_BACKWARD: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (frameNumber - 1 >= startFrame && canvasIsReady) {
                    searchAnnotations(jobInstance, frameNumber - 1, startFrame);
                }
            },
            PLAY_PAUSE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.onSwitchPlay();
            },
            FOCUS_INPUT_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (this.inputFrameRef.current) {
                    this.inputFrameRef.current.focus();
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={keyMap as any as KeyMap} handlers={handlers} allowChanges />
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
                    onURLIconClick={this.onURLIconClick}
                    changeWorkspace={changeWorkspace}
                    workspace={workspace}
                    playing={playing}
                    saving={saving}
                    savingStatuses={savingStatuses}
                    startFrame={startFrame}
                    stopFrame={stopFrame}
                    frameNumber={frameNumber}
                    inputFrameRef={this.inputFrameRef}
                    undoAction={undoAction}
                    redoAction={redoAction}
                    onUndoClick={this.undo}
                    onRedoClick={this.redo}
                />
            </>
        );
    }
}

export default withRouter(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    )(AnnotationTopBarContainer),
);
