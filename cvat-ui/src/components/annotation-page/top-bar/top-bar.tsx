// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Input from 'antd/lib/input';
import { Col, Row } from 'antd/lib/grid';

import {
    ActiveControl, CombinedState, ToolsBlockerState, Workspace,
} from 'reducers';
import { Job } from 'cvat-core-wrapper';
import { usePlugins } from 'utils/hooks';
import { KeyMap } from 'utils/mousetrap-react';
import LeftGroup from './left-group';
import PlayerButtons from './player-buttons';
import PlayerNavigation from './player-navigation';
import RightGroup from './right-group';

interface Props {
    playing: boolean;
    saving: boolean;
    frameNumber: number;
    frameFilename: string;
    frameDeleted: boolean;
    inputFrameRef: React.RefObject<Input>;
    startFrame: number;
    stopFrame: number;
    undoAction?: string;
    redoAction?: string;
    workspace: Workspace;
    undoShortcut: string;
    redoShortcut: string;
    drawShortcut: string;
    switchToolsBlockerShortcut: string;
    playPauseShortcut: string;
    deleteFrameShortcut: string;
    nextFrameShortcut: string;
    previousFrameShortcut: string;
    forwardShortcut: string;
    backwardShortcut: string;
    prevButtonType: string;
    nextButtonType: string;
    focusFrameInputShortcut: string;
    activeControl: ActiveControl;
    toolsBlockerState: ToolsBlockerState;
    deleteFrameAvailable: boolean;
    annotationFilters: object[];
    initialOpenGuide: boolean;
    keyMap: KeyMap;
    jobInstance: Job;
    ranges: string;
    changeWorkspace(workspace: Workspace): void;
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
    onSearchAnnotations(direction: 'forward' | 'backward'): void;
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
}

export default function AnnotationTopBarComponent(props: Props): JSX.Element {
    const {
        saving,
        undoAction,
        redoAction,
        playing,
        ranges,
        frameNumber,
        frameFilename,
        frameDeleted,
        inputFrameRef,
        startFrame,
        stopFrame,
        workspace,
        undoShortcut,
        redoShortcut,
        drawShortcut,
        switchToolsBlockerShortcut,
        playPauseShortcut,
        deleteFrameShortcut,
        nextFrameShortcut,
        previousFrameShortcut,
        forwardShortcut,
        backwardShortcut,
        prevButtonType,
        nextButtonType,
        focusFrameInputShortcut,
        activeControl,
        toolsBlockerState,
        annotationFilters,
        initialOpenGuide,
        deleteFrameAvailable,
        jobInstance,
        keyMap,
        showStatistics,
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
        onSearchAnnotations,
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
    } = props;

    const playerPlugins = usePlugins(
        (state: CombinedState) => state.plugins.components.annotationPage.header.player, props,
    );
    const playerItems: [JSX.Element, number][] = [];
    playerItems.push(
        ...playerPlugins.map(({ component: Component, weight }, index) => {
            const component = <Component targetProps={props} key={index} />;
            return [component, weight] as [JSX.Element, number];
        }),
    );

    if (workspace !== Workspace.SINGLE_SHAPE) {
        playerItems.push([(
            <PlayerButtons
                key='player_buttons'
                playing={playing}
                playPauseShortcut={playPauseShortcut}
                nextFrameShortcut={nextFrameShortcut}
                previousFrameShortcut={previousFrameShortcut}
                forwardShortcut={forwardShortcut}
                backwardShortcut={backwardShortcut}
                prevButtonType={prevButtonType}
                nextButtonType={nextButtonType}
                keyMap={keyMap}
                onPrevFrame={onPrevFrame}
                onNextFrame={onNextFrame}
                onForward={onForward}
                onBackward={onBackward}
                onFirstFrame={onFirstFrame}
                onLastFrame={onLastFrame}
                onSwitchPlay={onSwitchPlay}
                onSearchAnnotations={onSearchAnnotations}
                setPrevButton={setPrevButtonType}
                setNextButton={setNextButtonType}
            />
        ), 0]);

        playerItems.push([(
            <PlayerNavigation
                key='player_navigation'
                startFrame={startFrame}
                stopFrame={stopFrame}
                playing={playing}
                ranges={ranges}
                frameNumber={frameNumber}
                frameFilename={frameFilename}
                frameDeleted={frameDeleted}
                deleteFrameShortcut={deleteFrameShortcut}
                focusFrameInputShortcut={focusFrameInputShortcut}
                inputFrameRef={inputFrameRef}
                keyMap={keyMap}
                onSliderChange={onSliderChange}
                onInputChange={onInputChange}
                onURLIconClick={onURLIconClick}
                onDeleteFrame={onDeleteFrame}
                onRestoreFrame={onRestoreFrame}
                switchNavigationBlocked={switchNavigationBlocked}
                deleteFrameAvailable={deleteFrameAvailable}
            />
        ), 10]);
    }

    return (
        <Row justify='space-between'>
            <LeftGroup
                saving={saving}
                undoAction={undoAction}
                redoAction={redoAction}
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
                keyMap={keyMap}
            />
            <Col className='cvat-annotation-header-player-group'>
                <Row align='middle'>
                    { playerItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1])
                        .map((menuItem) => menuItem[0]) }
                </Row>
            </Col>
            <RightGroup
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
