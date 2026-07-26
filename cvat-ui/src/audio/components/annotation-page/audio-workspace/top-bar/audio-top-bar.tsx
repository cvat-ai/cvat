// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';

import { Workspace } from 'reducers';
import { Job } from 'cvat-core-wrapper';
import { KeyMap } from 'utils/mousetrap-react';

import AudioLeftGroup from './audio-left-group';
import AudioPlayerNavigation from './audio-player-navigation';
import AudioRightGroup from './audio-right-group';

interface Props {
    playing: boolean;
    saving: boolean;
    undoAction?: string;
    redoAction?: string;
    workspace: Workspace;
    undoShortcut: string;
    redoShortcut: string;
    keyMap: KeyMap;
    jobInstance: Job;
    audioCurrentTime: number;
    audioDuration: number;
    audioZoom: number;
    annotationFilters: object[];
    initialOpenGuide: boolean;
    changeWorkspace(workspace: Workspace): void;
    showStatistics(): void;
    showFilters(): void;
    onUndoClick(): void;
    onRedoClick(): void;
    onAudioPlayPause(): void;
    onAudioSeek(time: number): void;
}

export default function AudioTopBarComponent(props: Props): JSX.Element {
    const {
        saving,
        undoAction,
        redoAction,
        playing,
        workspace,
        undoShortcut,
        redoShortcut,
        jobInstance,
        keyMap,
        audioCurrentTime,
        audioDuration,
        audioZoom,
        annotationFilters,
        initialOpenGuide,
        showStatistics,
        showFilters,
        changeWorkspace,
        onUndoClick,
        onRedoClick,
        onAudioPlayPause,
        onAudioSeek,
    } = props;

    return (
        <Row justify='space-between'>
            <AudioLeftGroup
                saving={saving}
                undoAction={undoAction}
                redoAction={redoAction}
                undoShortcut={undoShortcut}
                redoShortcut={redoShortcut}
                onUndoClick={onUndoClick}
                onRedoClick={onRedoClick}
                keyMap={keyMap}
            />
            <Col className='cvat-annotation-header-player-group'>
                <Row align='middle'>
                    <AudioPlayerNavigation
                        playing={playing}
                        currentTime={audioCurrentTime}
                        duration={audioDuration}
                        zoom={audioZoom}
                        workspace={workspace}
                        keyMap={keyMap}
                        onPlayPause={onAudioPlayPause}
                        onSeek={onAudioSeek}
                    />
                </Row>
            </Col>
            <AudioRightGroup
                workspace={workspace}
                jobInstance={jobInstance}
                annotationFilters={annotationFilters}
                initialOpenGuide={initialOpenGuide}
                changeWorkspace={changeWorkspace}
                showStatistics={showStatistics}
                showFilters={showFilters}
            />
        </Row>
    );
}
