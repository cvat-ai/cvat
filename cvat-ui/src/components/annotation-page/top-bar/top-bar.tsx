// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';

import {
    Row,
    Col,
    Layout,
} from 'antd';

import { SliderValue } from 'antd/lib/slider';

import LeftGroup from './left-group';
import RightGroup from './right-group';
import PlayerNavigation from './player-navigation';
import PlayerButtons from './player-buttons';

interface Props {
    playing: boolean;
    saving: boolean;
    savingStatuses: string[];
    frameNumber: number;
    startFrame: number;
    stopFrame: number;
    undoAction?: string;
    redoAction?: string;
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
        startFrame,
        stopFrame,
        showStatistics,
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

    const keyMap = {
        SAVE_JOB: {
            name: 'Save the job',
            description: 'Send all changes of annotations to the server',
            sequence: 'ctrl+s',
            action: 'keydown',
        },
    };

    const handlers = {
        SAVE_JOB: (event: KeyboardEvent | undefined) => {
            if (event) {
                event.preventDefault();
            }
            onSaveAnnotation();
        },
    };

    return (
        <Layout.Header className='cvat-annotation-header'>
            <GlobalHotKeys keyMap={keyMap as KeyMap} handlers={handlers} />
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
                            onSliderChange={onSliderChange}
                            onInputChange={onInputChange}
                            onURLIconClick={onURLIconClick}
                        />
                    </Row>
                </Col>
                <RightGroup showStatistics={showStatistics} />
            </Row>
        </Layout.Header>
    );
}
