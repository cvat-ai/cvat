// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    InputNumber,
} from 'antd';

import { SliderValue } from 'antd/lib/slider';

import { Workspace } from 'reducers/interfaces';
import LeftGroup from './left-group';
import RightGroup from './right-group';
import PlayerNavigation from './player-navigation';
import PlayerButtons from './player-buttons';

interface Props {
    playing: boolean;
    saving: boolean;
    savingStatuses: string[];
    frameNumber: number;
    inputFrameRef: React.RefObject<InputNumber>;
    startFrame: number;
    stopFrame: number;
    undoAction?: string;
    redoAction?: string;
    workspace: Workspace;
    changeWorkspace(workspace: Workspace): void;
    showStatistics(): void;
    onSwitchPlay(): void;
    onSaveAnnotation(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
    onSliderChange(value: SliderValue): void;
    onInputChange(value: number | undefined): void;
    onURLIconClick(): void;
    onUndoClick(): void;
    onRedoClick(): void;
}

export default function AnnotationTopBarComponent(props: Props): JSX.Element {
    const {
        saving,
        savingStatuses,
        undoAction,
        redoAction,
        playing,
        frameNumber,
        inputFrameRef,
        startFrame,
        stopFrame,
        workspace,
        showStatistics,
        changeWorkspace,
        onSwitchPlay,
        onSaveAnnotation,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
        onSliderChange,
        onInputChange,
        onURLIconClick,
        onUndoClick,
        onRedoClick,
    } = props;

    return (
        <Row type='flex' justify='space-between'>
            <LeftGroup
                saving={saving}
                savingStatuses={savingStatuses}
                onSaveAnnotation={onSaveAnnotation}
                undoAction={undoAction}
                redoAction={redoAction}
                onUndoClick={onUndoClick}
                onRedoClick={onRedoClick}
            />
            <Col className='cvat-annotation-header-player-group'>
                <Row type='flex' align='middle'>
                    <PlayerButtons
                        playing={playing}
                        onPrevFrame={onPrevFrame}
                        onNextFrame={onNextFrame}
                        onForward={onForward}
                        onBackward={onBackward}
                        onFirstFrame={onFirstFrame}
                        onLastFrame={onLastFrame}
                        onSwitchPlay={onSwitchPlay}
                    />
                    <PlayerNavigation
                        startFrame={startFrame}
                        stopFrame={stopFrame}
                        frameNumber={frameNumber}
                        inputFrameRef={inputFrameRef}
                        onSliderChange={onSliderChange}
                        onInputChange={onInputChange}
                        onURLIconClick={onURLIconClick}
                    />
                </Row>
            </Col>
            <RightGroup
                workspace={workspace}
                changeWorkspace={changeWorkspace}
                showStatistics={showStatistics}
            />
        </Row>
    );
}
