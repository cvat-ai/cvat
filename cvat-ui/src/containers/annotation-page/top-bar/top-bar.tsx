// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import copy from 'copy-to-clipboard';

import {
    changeFrameAsync,
    changeWorkspace as changeWorkspaceAction,
    collectStatisticsAsync,
    redoActionAsync,
    saveAnnotationsAsync,
    searchAnnotationsAsync,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    showFilters as showFiltersAction,
    showStatistics as showStatisticsAction,
    switchPlay,
    undoActionAsync,
    deleteFrameAsync,
    restoreFrameAsync,
    switchNavigationBlocked as switchNavigationBlockedAction,
    setNavigationType as setNavigationTypeAction,
} from 'actions/annotation-actions';
import AnnotationTopBarComponent from 'components/annotation-page/top-bar/top-bar';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { DimensionType, Job, JobType } from 'cvat-core-wrapper';
import {
    CombinedState,
    FrameSpeed,
    Workspace,
    ActiveControl,
    ToolsBlockerState,
    NavigationType,
} from 'reducers';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import { KeyMap } from 'utils/mousetrap-react';
import { switchToolsBlockerState } from 'actions/settings-actions';
import { writeLatestFrame } from 'utils/remember-latest-frame';

interface StateToProps {
    jobInstance: Job;
    frameIsDeleted: boolean;
    frameNumber: number;
    frameFilename: string;
    frameStep: number;
    frameSpeed: FrameSpeed;
    frameDelay: number;
    frameFetching: boolean;
    playing: boolean;
    saving: boolean;
    canvasIsReady: boolean;
    undoAction?: string;
    redoAction?: string;
    autoSave: boolean;
    autoSaveInterval: number;
    toolsBlockerState: ToolsBlockerState;
    showDeletedFrames: boolean;
    workspace: Workspace;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas | Canvas3d;
    forceExit: boolean;
    ranges: string;
    activeControl: ActiveControl;
    annotationFilters: object[];
    initialOpenGuide: boolean;
    navigationType: NavigationType;
}

interface DispatchToProps {
    onChangeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void;
    onSwitchPlay(playing: boolean): void;
    onSaveAnnotation(): void;
    showStatistics(sessionInstance: Job): void;
    showFilters(): void;
    undo(): void;
    redo(): void;
    searchAnnotations(
        sessionInstance: Job,
        frameFrom: number,
        frameTo: number,
        generalFilters?: {
            isEmptyFrame: boolean;
        },
    ): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    changeWorkspace(workspace: Workspace): void;
    onSwitchToolsBlockerState(toolsBlockerState: ToolsBlockerState): void;
    deleteFrame(frame: number): void;
    restoreFrame(frame: number): void;
    switchNavigationBlocked(blocked: boolean): void;
    setNavigationType(navigationType: NavigationType): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                playing,
                ranges,
                frame: {
                    data: { deleted: frameIsDeleted },
                    filename: frameFilename,
                    number: frameNumber,
                    delay: frameDelay,
                    fetching: frameFetching,
                },
                navigationType,
            },
            annotations: {
                saving: { uploading: saving, forceExit },
                history,
                filters: annotationFilters,
            },
            job: { instance: jobInstance, queryParameters: { initialOpenGuide } },
            canvas: { ready: canvasIsReady, instance: canvasInstance, activeControl },
            workspace,
        },
        settings: {
            player: { frameSpeed, frameStep, showDeletedFrames },
            workspace: {
                autoSave,
                autoSaveInterval,
                toolsBlockerState,
            },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    return {
        frameIsDeleted,
        frameStep,
        frameSpeed,
        frameDelay,
        frameFetching,
        playing,
        canvasIsReady,
        saving,
        frameNumber,
        frameFilename,
        jobInstance: jobInstance as Job,
        undoAction: history.undo.length ? history.undo[history.undo.length - 1][0] : undefined,
        redoAction: history.redo.length ? history.redo[history.redo.length - 1][0] : undefined,
        autoSave,
        autoSaveInterval,
        toolsBlockerState,
        showDeletedFrames,
        workspace,
        keyMap,
        normalizedKeyMap,
        canvasInstance: canvasInstance as NonNullable<typeof canvasInstance>,
        forceExit,
        activeControl,
        ranges,
        annotationFilters,
        initialOpenGuide,
        navigationType,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void {
            dispatch(changeFrameAsync(frame, fillBuffer, frameStep));
        },
        onSwitchPlay(playing: boolean): void {
            dispatch(switchPlay(playing));
        },
        onSaveAnnotation(): void {
            dispatch(saveAnnotationsAsync());
        },
        showStatistics(sessionInstance: Job): void {
            dispatch(collectStatisticsAsync(sessionInstance));
            dispatch(showStatisticsAction(true));
        },
        showFilters(): void {
            dispatch(showFiltersAction(true));
        },
        undo(): void {
            dispatch(undoActionAsync());
        },
        redo(): void {
            dispatch(redoActionAsync());
        },
        searchAnnotations(
            sessionInstance: Job,
            frameFrom: number,
            frameTo: number,
            generalFilters?: {
                isEmptyFrame: boolean;
            },
        ): void {
            dispatch(searchAnnotationsAsync(sessionInstance, frameFrom, frameTo, generalFilters));
        },
        changeWorkspace(workspace: Workspace): void {
            dispatch(changeWorkspaceAction(workspace));
        },
        setForceExitAnnotationFlag(forceExit: boolean): void {
            dispatch(setForceExitAnnotationFlagAction(forceExit));
        },
        onSwitchToolsBlockerState(toolsBlockerState: ToolsBlockerState): void {
            dispatch(switchToolsBlockerState(toolsBlockerState));
        },
        deleteFrame(frame: number): void {
            dispatch(deleteFrameAsync(frame));
        },
        restoreFrame(frame: number): void {
            dispatch(restoreFrameAsync(frame));
        },
        switchNavigationBlocked(blocked: boolean): void {
            dispatch(switchNavigationBlockedAction(blocked));
        },
        setNavigationType(navigationType: NavigationType): void {
            dispatch(setNavigationTypeAction(navigationType));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;
class AnnotationTopBarContainer extends React.PureComponent<Props> {
    private inputFrameRef: React.RefObject<HTMLInputElement>;
    private autoSaveInterval: number | undefined;
    private unblock: any;

    constructor(props: Props) {
        super(props);
        this.inputFrameRef = React.createRef<HTMLInputElement>();
    }

    public componentDidMount(): void {
        const {
            autoSaveInterval, history, jobInstance, setForceExitAnnotationFlag,
        } = this.props;
        this.autoSaveInterval = window.setInterval(this.autoSave.bind(this), autoSaveInterval);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.unblock = history.block((location: any) => {
            const { forceExit, frameNumber } = self.props;
            const { id: jobID, taskId: taskID } = jobInstance;
            writeLatestFrame(jobInstance.id, frameNumber);

            if (
                jobInstance.annotations.hasUnsavedChanges() &&
                location.pathname !== `/tasks/${taskID}/jobs/${jobID}` &&
                !forceExit
            ) {
                return 'You have unsaved changes, please confirm leaving this page.';
            }

            if (forceExit) {
                setForceExitAnnotationFlag(false);
            }

            return undefined;
        });

        window.addEventListener('beforeunload', this.beforeUnloadCallback);
    }

    public componentDidUpdate(prevProps: Props): void {
        const { autoSaveInterval } = this.props;

        if (autoSaveInterval !== prevProps.autoSaveInterval) {
            if (this.autoSaveInterval) window.clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = window.setInterval(this.autoSave.bind(this), autoSaveInterval);
        }
        this.play();
    }

    public componentWillUnmount(): void {
        window.clearInterval(this.autoSaveInterval);
        window.removeEventListener('beforeunload', this.beforeUnloadCallback);
        this.unblock();
    }

    private undo = (): void => {
        const { undo, canvasIsReady, undoAction } = this.props;

        if (isAbleToChangeFrame() && canvasIsReady && undoAction) {
            undo();
        }
    };

    private redo = (): void => {
        const { redo, canvasIsReady, redoAction } = this.props;

        if (isAbleToChangeFrame() && canvasIsReady && redoAction) {
            redo();
        }
    };

    private showStatistics = (): void => {
        const { jobInstance, showStatistics } = this.props;
        showStatistics(jobInstance);
    };

    private showFilters = (): void => {
        const { showFilters } = this.props;
        showFilters();
    };

    private onSwitchPlay = (): void => {
        const {
            frameNumber, jobInstance, onSwitchPlay, playing,
        } = this.props;

        if (playing) {
            onSwitchPlay(false);
        } else if (frameNumber < jobInstance.stopFrame) {
            onSwitchPlay(true);
        }
    };

    private onFirstFrame = async (): Promise<void> => {
        const {
            frameNumber, jobInstance, playing,
            onSwitchPlay, showDeletedFrames, canvasIsReady,
        } = this.props;

        const newFrame =
            await jobInstance.frames.search({ notDeleted: !showDeletedFrames }, jobInstance.startFrame, frameNumber);
        if (newFrame !== frameNumber && newFrame !== null && canvasIsReady) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onBackward = async (): Promise<void> => {
        const {
            frameNumber, frameStep, jobInstance, playing,
            onSwitchPlay, showDeletedFrames, canvasIsReady,
        } = this.props;

        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames, offset: frameStep },
            Math.max(jobInstance.startFrame, frameNumber - 1),
            jobInstance.startFrame,
        );

        if (newFrame !== frameNumber && newFrame !== null && canvasIsReady) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onPrevFrame = async (): Promise<void> => {
        const {
            frameNumber, jobInstance, playing, searchAnnotations,
            onSwitchPlay, showDeletedFrames, canvasIsReady, navigationType,
        } = this.props;
        const { startFrame } = jobInstance;

        const frameFrom = Math.max(jobInstance.startFrame, frameNumber - 1);
        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames },
            frameFrom,
            jobInstance.startFrame,
        );

        if (newFrame !== frameNumber && newFrame !== null && canvasIsReady && isAbleToChangeFrame()) {
            if (playing) {
                onSwitchPlay(false);
            }

            if (navigationType === NavigationType.REGULAR) {
                this.changeFrame(newFrame);
            } else if (navigationType === NavigationType.FILTERED) {
                searchAnnotations(jobInstance, newFrame, startFrame);
            } else {
                searchAnnotations(jobInstance, newFrame, startFrame, { isEmptyFrame: true });
            }
        }
    };

    private onNextFrame = async (): Promise<void> => {
        const {
            frameNumber, jobInstance, playing, searchAnnotations,
            onSwitchPlay, showDeletedFrames, canvasIsReady, navigationType,
        } = this.props;
        const { stopFrame } = jobInstance;

        const frameFrom = Math.min(jobInstance.stopFrame, frameNumber + 1);
        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames },
            frameFrom,
            jobInstance.stopFrame,
        );
        if (newFrame !== frameNumber && newFrame !== null && canvasIsReady && isAbleToChangeFrame()) {
            if (playing) {
                onSwitchPlay(false);
            }

            if (navigationType === NavigationType.REGULAR) {
                this.changeFrame(newFrame);
            } else if (navigationType === NavigationType.FILTERED) {
                searchAnnotations(jobInstance, newFrame, stopFrame);
            } else {
                searchAnnotations(jobInstance, newFrame, stopFrame, { isEmptyFrame: true });
            }
        }
    };

    private onForward = async (): Promise<void> => {
        const {
            frameNumber, frameStep, jobInstance, playing,
            onSwitchPlay, showDeletedFrames, canvasIsReady,
        } = this.props;

        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames, offset: frameStep },
            Math.min(jobInstance.stopFrame, frameNumber + 1),
            jobInstance.stopFrame,
        );

        if (newFrame !== frameNumber && newFrame !== null && canvasIsReady) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onLastFrame = async (): Promise<void> => {
        const {
            frameNumber, jobInstance, playing,
            onSwitchPlay, showDeletedFrames, canvasIsReady,
        } = this.props;

        const newFrame =
            await jobInstance.frames.search({ notDeleted: !showDeletedFrames }, jobInstance.stopFrame, frameNumber);
        if (newFrame !== frameNumber && frameNumber !== null && canvasIsReady) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private searchAnnotations = (direction: 'forward' | 'backward'): void => {
        const {
            frameNumber, jobInstance,
            canvasIsReady, searchAnnotations,
        } = this.props;
        const { startFrame, stopFrame } = jobInstance;

        if (isAbleToChangeFrame() && canvasIsReady) {
            if (direction === 'forward' && frameNumber + 1 <= stopFrame) {
                searchAnnotations(jobInstance, frameNumber + 1, stopFrame);
            } else if (direction === 'backward' && frameNumber - 1 >= startFrame) {
                searchAnnotations(jobInstance, frameNumber - 1, startFrame);
            }
        }
    };

    private onSaveAnnotation = (): void => {
        const { onSaveAnnotation } = this.props;
        onSaveAnnotation();
    };

    private onChangePlayerSliderValue = async (value: number): Promise<void> => {
        const {
            playing, onSwitchPlay, jobInstance, showDeletedFrames,
        } = this.props;
        if (playing) {
            onSwitchPlay(false);
        }
        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames },
            Math.min(jobInstance.stopFrame, value),
            jobInstance.stopFrame,
        );
        if (newFrame !== null) {
            this.changeFrame(newFrame);
        }
    };

    private onChangePlayerInputValue = async (value: number): Promise<void> => {
        const {
            frameNumber, onSwitchPlay, playing, jobInstance, showDeletedFrames,
        } = this.props;

        if (value !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            const newFrame = await jobInstance.frames.search(
                { notDeleted: !showDeletedFrames },
                Math.min(jobInstance.stopFrame, value),
                jobInstance.stopFrame,
            );
            if (newFrame !== null) {
                this.changeFrame(newFrame);
            }
        }
    };

    private onFinishDraw = (): void => {
        const { activeControl, canvasInstance } = this.props;
        if (
            [ActiveControl.AI_TOOLS, ActiveControl.OPENCV_TOOLS].includes(activeControl) &&
            canvasInstance instanceof Canvas
        ) {
            canvasInstance.interact({ enabled: false });
            return;
        }

        canvasInstance.draw({ enabled: false });
    };

    private onSwitchToolsBlockerState = (): void => {
        const {
            toolsBlockerState, onSwitchToolsBlockerState, canvasInstance, activeControl,
        } = this.props;
        if (canvasInstance instanceof Canvas) {
            if (activeControl.includes(ActiveControl.OPENCV_TOOLS)) {
                canvasInstance.interact({
                    enabled: true,
                    crosshair: toolsBlockerState.algorithmsLocked,
                    enableThreshold: toolsBlockerState.algorithmsLocked,
                });
            }
        }
        onSwitchToolsBlockerState({ algorithmsLocked: !toolsBlockerState.algorithmsLocked });
    };

    private onURLIconClick = (): void => {
        const { frameNumber } = this.props;
        const { origin, pathname } = window.location;
        const url = `${origin}${pathname}?frame=${frameNumber}`;
        copy(url);
    };

    private onDeleteFrame = (): void => {
        const {
            deleteFrame, frameNumber, jobInstance, canvasIsReady,
        } = this.props;
        if (canvasIsReady && jobInstance.type !== JobType.GROUND_TRUTH) deleteFrame(frameNumber);
    };

    private onRestoreFrame = (): void => {
        const { restoreFrame, frameNumber } = this.props;
        restoreFrame(frameNumber);
    };

    private changeWorkspace = (workspace: Workspace): void => {
        const { changeWorkspace } = this.props;
        changeWorkspace(workspace);
        if (window.document.activeElement) {
            (window.document.activeElement as HTMLElement).blur();
        }
    };

    private beforeUnloadCallback = (event: BeforeUnloadEvent): string | undefined => {
        const { jobInstance, forceExit, setForceExitAnnotationFlag } = this.props;
        const { frameNumber } = this.props;

        writeLatestFrame(jobInstance.id, frameNumber);
        if (jobInstance.annotations.hasUnsavedChanges() && !forceExit) {
            const confirmationMessage = 'You have unsaved changes, please confirm leaving this page.';
            // eslint-disable-next-line no-param-reassign
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }

        if (forceExit) {
            setForceExitAnnotationFlag(false);
        }
        return undefined;
    };

    private play(): void {
        const {
            jobInstance,
            frameSpeed,
            frameNumber,
            frameDelay,
            frameFetching,
            playing,
            canvasIsReady,
            onSwitchPlay,
            onChangeFrame,
        } = this.props;

        if (playing && canvasIsReady && !frameFetching) {
            if (frameNumber < jobInstance.stopFrame) {
                let framesSkipped = 0;
                if (frameSpeed === FrameSpeed.Fast && frameNumber + 1 < jobInstance.stopFrame) {
                    framesSkipped = 1;
                }
                if (frameSpeed === FrameSpeed.Fastest && frameNumber + 2 < jobInstance.stopFrame) {
                    framesSkipped = 2;
                }

                setTimeout(async () => {
                    const { playing: stillPlaying } = this.props;
                    if (stillPlaying) {
                        if (isAbleToChangeFrame()) {
                            if (jobInstance.type === JobType.GROUND_TRUTH) {
                                const newFrame = await jobInstance.frames.search(
                                    { notDeleted: true },
                                    frameNumber + 1,
                                    jobInstance.stopFrame,
                                );
                                if (newFrame !== null) {
                                    onChangeFrame(newFrame, stillPlaying);
                                } else {
                                    onSwitchPlay(false);
                                }
                            } else {
                                onChangeFrame(frameNumber + 1 + framesSkipped, stillPlaying, framesSkipped + 1);
                            }
                        } else if (jobInstance.dimension === DimensionType.DIMENSION_2D) {
                            onSwitchPlay(false);
                        } else {
                            setTimeout(() => this.play(), frameDelay);
                        }
                    }
                }, frameDelay);
            } else {
                onSwitchPlay(false);
            }
        }
    }

    private autoSave(): void {
        const { autoSave, saving } = this.props;

        if (autoSave && !saving) {
            this.onSaveAnnotation();
        }
    }

    private changeFrame(frame: number): void {
        const { onChangeFrame } = this.props;
        if (isAbleToChangeFrame()) {
            onChangeFrame(frame);
        }
    }

    public render(): JSX.Element {
        const {
            playing,
            saving,
            jobInstance,
            jobInstance: { startFrame, stopFrame },
            frameNumber,
            frameFilename,
            frameIsDeleted,
            undoAction,
            redoAction,
            workspace,
            keyMap,
            ranges,
            normalizedKeyMap,
            activeControl,
            annotationFilters,
            initialOpenGuide,
            toolsBlockerState,
            navigationType,
            switchNavigationBlocked,
            setNavigationType,
        } = this.props;

        return (
            <AnnotationTopBarComponent
                showStatistics={this.showStatistics}
                showFilters={this.showFilters}
                onSwitchPlay={this.onSwitchPlay}
                onSaveAnnotation={this.onSaveAnnotation}
                onPrevFrame={this.onPrevFrame}
                onNextFrame={this.onNextFrame}
                onForward={this.onForward}
                onBackward={this.onBackward}
                onFirstFrame={this.onFirstFrame}
                onLastFrame={this.onLastFrame}
                onSearchAnnotations={this.searchAnnotations}
                setNavigationType={setNavigationType}
                onSliderChange={this.onChangePlayerSliderValue}
                onInputChange={this.onChangePlayerInputValue}
                onURLIconClick={this.onURLIconClick}
                onDeleteFrame={this.onDeleteFrame}
                onRestoreFrame={this.onRestoreFrame}
                changeWorkspace={this.changeWorkspace}
                switchNavigationBlocked={switchNavigationBlocked}
                keyMap={keyMap}
                workspace={workspace}
                playing={playing}
                saving={saving}
                ranges={ranges}
                startFrame={startFrame}
                stopFrame={stopFrame}
                frameNumber={frameNumber}
                frameFilename={frameFilename}
                frameDeleted={frameIsDeleted}
                inputFrameRef={this.inputFrameRef}
                undoAction={undoAction}
                redoAction={redoAction}
                undoShortcut={normalizedKeyMap.UNDO}
                redoShortcut={normalizedKeyMap.REDO}
                drawShortcut={normalizedKeyMap.SWITCH_DRAW_MODE}
                // this shortcut is handled in interactionHandler.ts separately
                switchToolsBlockerShortcut={normalizedKeyMap.SWITCH_TOOLS_BLOCKER_STATE}
                playPauseShortcut={normalizedKeyMap.PLAY_PAUSE}
                deleteFrameShortcut={normalizedKeyMap.DELETE_FRAME}
                nextFrameShortcut={normalizedKeyMap.NEXT_FRAME}
                previousFrameShortcut={normalizedKeyMap.PREV_FRAME}
                forwardShortcut={normalizedKeyMap.FORWARD_FRAME}
                backwardShortcut={normalizedKeyMap.BACKWARD_FRAME}
                navigationType={navigationType}
                focusFrameInputShortcut={normalizedKeyMap.FOCUS_INPUT_FRAME}
                annotationFilters={annotationFilters}
                initialOpenGuide={initialOpenGuide}
                onUndoClick={this.undo}
                onRedoClick={this.redo}
                onFinishDraw={this.onFinishDraw}
                onSwitchToolsBlockerState={this.onSwitchToolsBlockerState}
                toolsBlockerState={toolsBlockerState}
                jobInstance={jobInstance}
                activeControl={activeControl}
                deleteFrameAvailable={jobInstance.type !== JobType.GROUND_TRUTH}
            />
        );
    }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AnnotationTopBarContainer));
