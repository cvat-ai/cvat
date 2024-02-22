// Copyright (C) 2020-2024 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { CSSProperties } from 'react';
import { Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';
import Popover from 'antd/lib/popover';

import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { NavigationType, Workspace } from 'reducers';
import {
    FirstIcon,
    BackJumpIcon,
    PreviousIcon,
    PreviousFilteredIcon,
    PreviousEmptyIcon,
    PlayIcon,
    PauseIcon,
    NextIcon,
    NextFilteredIcon,
    NextEmptyIcon,
    ForwardJumpIcon,
    LastIcon,
} from 'icons';

interface Props {
    playing: boolean;
    playPauseShortcut: string;
    nextFrameShortcut: string;
    previousFrameShortcut: string;
    forwardShortcut: string;
    backwardShortcut: string;
    keyMap: KeyMap;
    workspace: Workspace;
    navigationType: NavigationType;
    onSwitchPlay(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
    onSearchAnnotations(direction: 'forward' | 'backward'): void;
    setNavigationType(navigationType: NavigationType): void;
}

function PlayerButtons(props: Props): JSX.Element {
    const {
        playing,
        playPauseShortcut,
        nextFrameShortcut,
        previousFrameShortcut,
        forwardShortcut,
        backwardShortcut,
        keyMap,
        navigationType,
        workspace,
        onSwitchPlay,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
        setNavigationType,
        onSearchAnnotations,
    } = props;

    const subKeyMap = {
        NEXT_FRAME: keyMap.NEXT_FRAME,
        PREV_FRAME: keyMap.PREV_FRAME,
        ...(workspace !== Workspace.SINGLE_SHAPE ? {
            FORWARD_FRAME: keyMap.FORWARD_FRAME,
            BACKWARD_FRAME: keyMap.BACKWARD_FRAME,
            SEARCH_FORWARD: keyMap.SEARCH_FORWARD,
            SEARCH_BACKWARD: keyMap.SEARCH_BACKWARD,
            PLAY_PAUSE: keyMap.PLAY_PAUSE,
            FOCUS_INPUT_FRAME: keyMap.FOCUS_INPUT_FRAME,
        } : {}),
    };

    const handlers = {
        NEXT_FRAME: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            onNextFrame();
        },
        PREV_FRAME: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            onPrevFrame();
        },
        ...(workspace !== Workspace.SINGLE_SHAPE ? {
            FORWARD_FRAME: (event: KeyboardEvent | undefined) => {
                event?.preventDefault();
                onForward();
            },
            BACKWARD_FRAME: (event: KeyboardEvent | undefined) => {
                event?.preventDefault();
                onBackward();
            },
            SEARCH_FORWARD: (event: KeyboardEvent | undefined) => {
                event?.preventDefault();
                onSearchAnnotations('forward');
            },
            SEARCH_BACKWARD: (event: KeyboardEvent | undefined) => {
                event?.preventDefault();
                onSearchAnnotations('backward');
            },
            PLAY_PAUSE: (event: KeyboardEvent | undefined) => {
                event?.preventDefault();
                onSwitchPlay();
            },
        } : {}),
    };

    const prevRegularText = 'Go back';
    const prevFilteredText = 'Go back with a filter';
    const prevEmptyText = 'Go back to an empty frame';
    const nextRegularText = 'Go next';
    const nextFilteredText = 'Go next with a filter';
    const nextEmptyText = 'Go next to an empty frame';

    let prevButton = <Icon className='cvat-player-previous-button' component={PreviousIcon} onClick={onPrevFrame} />;
    let prevButtonTooltipMessage = prevRegularText;
    if (navigationType === NavigationType.FILTERED) {
        prevButton = (
            <Icon
                className='cvat-player-previous-button-filtered'
                component={PreviousFilteredIcon}
                onClick={onPrevFrame}
            />
        );
        prevButtonTooltipMessage = prevFilteredText;
    } else if (navigationType === NavigationType.EMPTY) {
        prevButton = (
            <Icon className='cvat-player-previous-button-empty' component={PreviousEmptyIcon} onClick={onPrevFrame} />
        );
        prevButtonTooltipMessage = prevEmptyText;
    }

    let nextButton = <Icon className='cvat-player-next-button' component={NextIcon} onClick={onNextFrame} />;
    let nextButtonTooltipMessage = nextRegularText;
    if (navigationType === NavigationType.FILTERED) {
        nextButton = (
            <Icon className='cvat-player-next-button-filtered' component={NextFilteredIcon} onClick={onNextFrame} />
        );
        nextButtonTooltipMessage = nextFilteredText;
    } else if (navigationType === NavigationType.EMPTY) {
        nextButton = <Icon className='cvat-player-next-button-empty' component={NextEmptyIcon} onClick={onNextFrame} />;
        nextButtonTooltipMessage = nextEmptyText;
    }

    const navIconStyle: CSSProperties = workspace === Workspace.SINGLE_SHAPE ? {
        pointerEvents: 'none',
        opacity: 0.5,
    } : {};

    return (
        <Col className='cvat-player-buttons'>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
            <CVATTooltip title='Go to the first frame'>
                <Icon
                    style={navIconStyle}
                    className='cvat-player-first-button'
                    component={FirstIcon}
                    onClick={onFirstFrame}
                />
            </CVATTooltip>
            <CVATTooltip title={`Go back with a step ${backwardShortcut}`}>
                <Icon
                    style={navIconStyle}
                    className='cvat-player-backward-button'
                    component={BackJumpIcon}
                    onClick={onBackward}
                />
            </CVATTooltip>
            <Popover
                trigger='contextMenu'
                placement='bottom'
                content={(
                    <>
                        <CVATTooltip title={`${prevRegularText}`}>
                            <Icon
                                className='cvat-player-previous-inlined-button'
                                component={PreviousIcon}
                                onClick={() => setNavigationType(NavigationType.REGULAR)}
                            />
                        </CVATTooltip>
                        <CVATTooltip title={`${prevFilteredText}`}>
                            <Icon
                                className='cvat-player-previous-filtered-inlined-button'
                                component={PreviousFilteredIcon}
                                onClick={() => setNavigationType(NavigationType.FILTERED)}
                            />
                        </CVATTooltip>
                        <CVATTooltip title={`${prevEmptyText}`}>
                            <Icon
                                className='cvat-player-previous-empty-inlined-button'
                                component={PreviousEmptyIcon}
                                onClick={() => setNavigationType(NavigationType.EMPTY)}
                            />
                        </CVATTooltip>
                    </>
                )}
            >
                <CVATTooltip placement='top' title={`${prevButtonTooltipMessage} ${previousFrameShortcut}`}>
                    {prevButton}
                </CVATTooltip>
            </Popover>

            {!playing ? (
                <CVATTooltip title={`Play ${playPauseShortcut}`}>
                    <Icon
                        style={navIconStyle}
                        className='cvat-player-play-button'
                        component={PlayIcon}
                        onClick={onSwitchPlay}
                    />
                </CVATTooltip>
            ) : (
                <CVATTooltip title={`Pause ${playPauseShortcut}`}>
                    <Icon
                        style={navIconStyle}
                        className='cvat-player-pause-button'
                        component={PauseIcon}
                        onClick={onSwitchPlay}
                    />
                </CVATTooltip>
            )}

            <Popover
                trigger='contextMenu'
                placement='bottom'
                content={(
                    <>
                        <CVATTooltip title={`${nextRegularText}`}>
                            <Icon
                                className='cvat-player-next-inlined-button'
                                component={NextIcon}
                                onClick={() => setNavigationType(NavigationType.REGULAR)}
                            />
                        </CVATTooltip>
                        <CVATTooltip title={`${nextFilteredText}`}>
                            <Icon
                                className='cvat-player-next-filtered-inlined-button'
                                component={NextFilteredIcon}
                                onClick={() => setNavigationType(NavigationType.FILTERED)}
                            />
                        </CVATTooltip>
                        <CVATTooltip title={`${nextEmptyText}`}>
                            <Icon
                                className='cvat-player-next-empty-inlined-button'
                                component={NextEmptyIcon}
                                onClick={() => setNavigationType(NavigationType.EMPTY)}
                            />
                        </CVATTooltip>
                    </>
                )}
            >
                <CVATTooltip placement='top' title={`${nextButtonTooltipMessage} ${nextFrameShortcut}`}>
                    {nextButton}
                </CVATTooltip>
            </Popover>
            <CVATTooltip title={`Go next with a step ${forwardShortcut}`}>
                <Icon
                    style={navIconStyle}
                    className='cvat-player-forward-button'
                    component={ForwardJumpIcon}
                    onClick={onForward}
                />
            </CVATTooltip>
            <CVATTooltip title='Go to the last frame'>
                <Icon
                    style={navIconStyle}
                    className='cvat-player-last-button'
                    component={LastIcon}
                    onClick={onLastFrame}
                />
            </CVATTooltip>
        </Col>
    );
}

export default React.memo(PlayerButtons);
