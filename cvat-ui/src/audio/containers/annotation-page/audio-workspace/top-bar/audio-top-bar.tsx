// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';

import {
    changeWorkspaceAsync,
    collectStatisticsAsync,
    saveAnnotationsAsync,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    showFilters as showFiltersAction,
    showStatistics as showStatisticsAction,
} from 'actions/annotation-actions';
import { audioActions, audioRedoAsync, audioUndoAsync } from 'actions/audio-actions';
import AudioTopBarComponent from 'audio/components/annotation-page/audio-workspace/top-bar/audio-top-bar';
import { Job } from 'cvat-core-wrapper';
import { CombinedState, Workspace } from 'reducers';
import { KeyMap } from 'utils/mousetrap-react';
import { writeLatestFrame } from 'utils/remember-latest-frame';
import { getCVATStore } from 'cvat-store';

interface StateToProps {
    jobInstance: Job;
    frameNumber: number;
    playing: boolean;
    saving: boolean;
    undoAction?: string;
    redoAction?: string;
    autoSave: boolean;
    autoSaveInterval: number;
    workspace: Workspace;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    forceExit: boolean;
    annotationFilters: object[];
    initialOpenGuide: boolean;
    audioCurrentTime: number;
    audioDuration: number;
    audioZoom: number;
}

interface DispatchToProps {
    onSaveAnnotation(): void;
    showStatistics(sessionInstance: Job): void;
    showFilters(): void;
    audioUndo(): void;
    audioRedo(): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    changeWorkspace(workspace: Workspace): void;
    onAudioPlayPause(): void;
    onAudioSeek(time: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                frame: { number: frameNumber },
            },
            annotations: {
                saving: { uploading: saving, forceExit },
                filters: annotationFilters,
                history: annotationsHistory,
            },
            job: { instance: jobInstance, queryParameters: { initialOpenGuide } },
            workspace,
        },
        audio: {
            player: {
                playing,
                currentTime: audioCurrentTime,
                duration: audioDuration,
                zoom: audioZoom,
            },
        },
        settings: {
            workspace: { autoSave, autoSaveInterval },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    return {
        jobInstance: jobInstance as Job,
        frameNumber,
        playing,
        saving,
        undoAction: annotationsHistory.undo.length ?
            annotationsHistory.undo[annotationsHistory.undo.length - 1][0] : undefined,
        redoAction: annotationsHistory.redo.length ?
            annotationsHistory.redo[annotationsHistory.redo.length - 1][0] : undefined,
        autoSave,
        autoSaveInterval,
        workspace,
        keyMap,
        normalizedKeyMap,
        forceExit,
        annotationFilters,
        initialOpenGuide,
        audioCurrentTime,
        audioDuration,
        audioZoom,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
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
        audioUndo(): void {
            dispatch(audioUndoAsync());
        },
        audioRedo(): void {
            dispatch(audioRedoAsync());
        },
        changeWorkspace(workspace: Workspace): void {
            dispatch(changeWorkspaceAsync(workspace));
        },
        setForceExitAnnotationFlag(forceExit: boolean): void {
            dispatch(setForceExitAnnotationFlagAction(forceExit));
        },
        onAudioPlayPause(): void {
            const store = getCVATStore();
            const { player } = store.getState().audio;
            dispatch(audioActions.switchAudioPlay(!player.playing));
        },
        onAudioSeek(time: number): void {
            dispatch(audioActions.setAudioCurrentTime(time));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;

class AudioTopBarContainer extends React.PureComponent<Props> {
    private autoSaveInterval: number | undefined;
    private unblock: any;

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
    }

    public componentWillUnmount(): void {
        window.clearInterval(this.autoSaveInterval);
        window.removeEventListener('beforeunload', this.beforeUnloadCallback);
        this.unblock();
    }

    private undo = (): void => {
        const { audioUndo, undoAction } = this.props;
        if (undoAction) audioUndo();
    };

    private redo = (): void => {
        const { audioRedo, redoAction } = this.props;
        if (redoAction) audioRedo();
    };

    private changeWorkspace = (workspace: Workspace): void => {
        const { changeWorkspace } = this.props;
        changeWorkspace(workspace);
        if (window.document.activeElement) {
            (window.document.activeElement as HTMLElement).blur();
        }
    };

    private beforeUnloadCallback = (event: BeforeUnloadEvent): string | undefined => {
        const {
            jobInstance, forceExit, setForceExitAnnotationFlag, frameNumber,
        } = this.props;

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

    private autoSave(): void {
        const { autoSave, saving, onSaveAnnotation } = this.props;

        if (autoSave && !saving) {
            onSaveAnnotation();
        }
    }

    public render(): JSX.Element {
        const {
            playing,
            saving,
            jobInstance,
            undoAction,
            redoAction,
            workspace,
            keyMap,
            normalizedKeyMap,
            annotationFilters,
            initialOpenGuide,
            audioCurrentTime,
            audioDuration,
            audioZoom,
            onAudioPlayPause,
            onAudioSeek,
            showFilters,
            showStatistics,
        } = this.props;

        return (
            <AudioTopBarComponent
                playing={playing}
                saving={saving}
                workspace={workspace}
                jobInstance={jobInstance}
                keyMap={keyMap}
                undoAction={undoAction}
                redoAction={redoAction}
                undoShortcut={normalizedKeyMap.AUDIO_UNDO ?? normalizedKeyMap.UNDO ?? ''}
                redoShortcut={normalizedKeyMap.AUDIO_REDO ?? normalizedKeyMap.REDO ?? ''}
                audioCurrentTime={audioCurrentTime ?? 0}
                audioDuration={audioDuration ?? 0}
                audioZoom={audioZoom ?? 1}
                annotationFilters={annotationFilters}
                initialOpenGuide={initialOpenGuide}
                changeWorkspace={this.changeWorkspace}
                showFilters={showFilters}
                showStatistics={() => showStatistics(jobInstance)}
                onUndoClick={this.undo}
                onRedoClick={this.redo}
                onAudioPlayPause={onAudioPlayPause}
                onAudioSeek={onAudioSeek}
            />
        );
    }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AudioTopBarContainer));
