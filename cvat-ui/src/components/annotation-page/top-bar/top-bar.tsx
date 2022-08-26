// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Input from 'antd/lib/input';
import { Col, Row } from 'antd/lib/grid';

import {
    ActiveControl, PredictorState, ToolsBlockerState, Workspace,
} from 'reducers';
import LeftGroup from './left-group';
import PlayerButtons from './player-buttons';
import PlayerNavigation from './player-navigation';
import RightGroup from './right-group';

interface Props {
    playing: boolean;
    saving: boolean;
    savingStatuses: string[];
    frameNumber: number;
    frameFilename: string;
    frameDeleted: boolean;
    inputFrameRef: React.RefObject<Input>;
    startFrame: number;
    stopFrame: number;
    undoAction?: string;
    redoAction?: string;
    workspace: Workspace;
    saveShortcut: string;
    undoShortcut: string;
    redoShortcut: string;
    drawShortcut: string;
    switchToolsBlockerShortcut: string;
    playPauseShortcut: string;
    nextFrameShortcut: string;
    previousFrameShortcut: string;
    forwardShortcut: string;
    backwardShortcut: string;
    prevButtonType: string;
    nextButtonType: string;
    focusFrameInputShortcut: string;
    predictor: PredictorState;
    isTrainingActive: boolean;
    activeControl: ActiveControl;
    toolsBlockerState: ToolsBlockerState;
    changeWorkspace(workspace: Workspace): void;
    switchPredictor(predictorEnabled: boolean): void;
    showStatistics(): void;
    showFilters(): void;
    onSwitchPlay(): void;
    onSaveAnnotation(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
    setPrevButtonType(type: 'regular' | 'filtered' | 'empty'): void;
    setNextButtonType(type: 'regular' | 'filtered' | 'empty'): void;
    onSliderChange(value: number): void;
    onInputChange(value: number): void;
    onURLIconClick(): void;
    onUndoClick(): void;
    onRedoClick(): void;
    onFinishDraw(): void;
    onSwitchToolsBlockerState(): void;
    onDeleteFrame(): void;
    onRestoreFrame(): void;
    switchNavigationBlocked(blocked: boolean): void;
    jobInstance: any;
}

export default function AnnotationTopBarComponent(props: Props): JSX.Element {
    const {
        saving,
        savingStatuses,
        undoAction,
        redoAction,
        playing,
        frameNumber,
        frameFilename,
        frameDeleted,
        inputFrameRef,
        startFrame,
        stopFrame,
        workspace,
        saveShortcut,
        undoShortcut,
        redoShortcut,
        drawShortcut,
        switchToolsBlockerShortcut,
        playPauseShortcut,
        nextFrameShortcut,
        previousFrameShortcut,
        forwardShortcut,
        backwardShortcut,
        prevButtonType,
        nextButtonType,
        predictor,
        focusFrameInputShortcut,
        activeControl,
        toolsBlockerState,
        showStatistics,
        switchPredictor,
        showFilters,
        changeWorkspace,
        onSwitchPlay,
        onSaveAnnotation,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
        setPrevButtonType,
        setNextButtonType,
        onSliderChange,
        onInputChange,
        onURLIconClick,
        onUndoClick,
        onRedoClick,
        onFinishDraw,
        onSwitchToolsBlockerState,
        onDeleteFrame,
        onRestoreFrame,
        switchNavigationBlocked,
        jobInstance,
        isTrainingActive,
    } = props;

    return (
        <Row justify='space-between'>
            <LeftGroup
                saving={saving}
                savingStatuses={savingStatuses}
                undoAction={undoAction}
                redoAction={redoAction}
                saveShortcut={saveShortcut}
                undoShortcut={undoShortcut}
                redoShortcut={redoShortcut}
                activeControl={activeControl}
                drawShortcut={drawShortcut}
                switchToolsBlockerShortcut={switchToolsBlockerShortcut}
                toolsBlockerState={toolsBlockerState}
                onSaveAnnotation={onSaveAnnotation}
                onUndoClick={onUndoClick}
                onRedoClick={onRedoClick}
                onFinishDraw={onFinishDraw}
                onSwitchToolsBlockerState={onSwitchToolsBlockerState}
            />
            <Col className='cvat-annotation-header-player-group'>
                <Row align='middle'>
                    <PlayerButtons
                        playing={playing}
                        playPauseShortcut={playPauseShortcut}
                        nextFrameShortcut={nextFrameShortcut}
                        previousFrameShortcut={previousFrameShortcut}
                        forwardShortcut={forwardShortcut}
                        backwardShortcut={backwardShortcut}
                        prevButtonType={prevButtonType}
                        nextButtonType={nextButtonType}
                        onPrevFrame={onPrevFrame}
                        onNextFrame={onNextFrame}
                        onForward={onForward}
                        onBackward={onBackward}
                        onFirstFrame={onFirstFrame}
                        onLastFrame={onLastFrame}
                        onSwitchPlay={onSwitchPlay}
                        setPrevButton={setPrevButtonType}
                        setNextButton={setNextButtonType}
                    />
                    <PlayerNavigation
                        startFrame={startFrame}
                        stopFrame={stopFrame}
                        playing={playing}
                        frameNumber={frameNumber}
                        frameFilename={frameFilename}
                        frameDeleted={frameDeleted}
                        focusFrameInputShortcut={focusFrameInputShortcut}
                        inputFrameRef={inputFrameRef}
                        onSliderChange={onSliderChange}
                        onInputChange={onInputChange}
                        onURLIconClick={onURLIconClick}
                        onDeleteFrame={onDeleteFrame}
                        onRestoreFrame={onRestoreFrame}
                        switchNavigationBlocked={switchNavigationBlocked}
                    />
                </Row>
            </Col>
            <RightGroup
                predictor={predictor}
                workspace={workspace}
                switchPredictor={switchPredictor}
                jobInstance={jobInstance}
                changeWorkspace={changeWorkspace}
                showStatistics={showStatistics}
                isTrainingActive={isTrainingActive}
                showFilters={showFilters}
            />
        </Row>
    );
}
