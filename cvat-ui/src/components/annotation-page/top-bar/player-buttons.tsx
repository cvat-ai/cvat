// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';
import Popover from 'antd/lib/popover';

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
    prevButtonType: string;
    nextButtonType: string;
    onSwitchPlay(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
    setPrevButton(type: 'regular' | 'filtered' | 'empty'): void;
    setNextButton(type: 'regular' | 'filtered' | 'empty'): void;
}

function PlayerButtons(props: Props): JSX.Element {
    const {
        playing,
        playPauseShortcut,
        nextFrameShortcut,
        previousFrameShortcut,
        forwardShortcut,
        backwardShortcut,
        prevButtonType,
        nextButtonType,
        onSwitchPlay,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
        setPrevButton,
        setNextButton,
    } = props;

    const prevRegularText = 'Go back';
    const prevFilteredText = 'Go back with a filter';
    const prevEmptyText = 'Go back to an empty frame';
    const nextRegularText = 'Go next';
    const nextFilteredText = 'Go next with a filter';
    const nextEmptyText = 'Go next to an empty frame';

    let prevButton = <Icon className='cvat-player-previous-button' component={PreviousIcon} onClick={onPrevFrame} />;
    let prevButtonTooltipMessage = prevRegularText;
    if (prevButtonType === 'filtered') {
        prevButton = (
            <Icon className='cvat-player-previous-button' component={PreviousFilteredIcon} onClick={onPrevFrame} />
        );
        prevButtonTooltipMessage = prevFilteredText;
    } else if (prevButtonType === 'empty') {
        prevButton = (
            <Icon className='cvat-player-previous-button' component={PreviousEmptyIcon} onClick={onPrevFrame} />
        );
        prevButtonTooltipMessage = prevEmptyText;
    }

    let nextButton = <Icon className='cvat-player-next-button' component={NextIcon} onClick={onNextFrame} />;
    let nextButtonTooltipMessage = nextRegularText;
    if (nextButtonType === 'filtered') {
        nextButton = (
            <Icon className='cvat-player-previous-button' component={NextFilteredIcon} onClick={onNextFrame} />
        );
        nextButtonTooltipMessage = nextFilteredText;
    } else if (nextButtonType === 'empty') {
        nextButton = <Icon className='cvat-player-previous-button' component={NextEmptyIcon} onClick={onNextFrame} />;
        nextButtonTooltipMessage = nextEmptyText;
    }

    return (
        <Col className='cvat-player-buttons'>
            <Tooltip title='Go to the first frame' mouseLeaveDelay={0}>
                <Icon className='cvat-player-first-button' component={FirstIcon} onClick={onFirstFrame} />
            </Tooltip>
            <Tooltip title={`Go back with a step ${backwardShortcut}`} mouseLeaveDelay={0}>
                <Icon className='cvat-player-backward-button' component={BackJumpIcon} onClick={onBackward} />
            </Tooltip>
            <Popover
                trigger='contextMenu'
                placement='bottom'
                content={(
                    <>
                        <Tooltip title={`${prevRegularText}`} mouseLeaveDelay={0}>
                            <Icon
                                className='cvat-player-previous-inlined-button'
                                component={PreviousIcon}
                                onClick={() => {
                                    setPrevButton('regular');
                                }}
                            />
                        </Tooltip>
                        <Tooltip title={`${prevFilteredText}`} mouseLeaveDelay={0}>
                            <Icon
                                className='cvat-player-previous-filtered-inlined-button'
                                component={PreviousFilteredIcon}
                                onClick={() => {
                                    setPrevButton('filtered');
                                }}
                            />
                        </Tooltip>
                        <Tooltip title={`${prevEmptyText}`} mouseLeaveDelay={0}>
                            <Icon
                                className='cvat-player-previous-empty-inlined-button'
                                component={PreviousEmptyIcon}
                                onClick={() => {
                                    setPrevButton('empty');
                                }}
                            />
                        </Tooltip>
                    </>
                )}
            >
                <Tooltip
                    placement='top'
                    mouseLeaveDelay={0}
                    title={`${prevButtonTooltipMessage} ${previousFrameShortcut}`}
                >
                    {prevButton}
                </Tooltip>
            </Popover>

            {!playing ? (
                <Tooltip title={`Play ${playPauseShortcut}`} mouseLeaveDelay={0}>
                    <Icon className='cvat-player-play-button' component={PlayIcon} onClick={onSwitchPlay} />
                </Tooltip>
            ) : (
                <Tooltip title={`Pause ${playPauseShortcut}`} mouseLeaveDelay={0}>
                    <Icon className='cvat-player-pause-button' component={PauseIcon} onClick={onSwitchPlay} />
                </Tooltip>
            )}

            <Popover
                trigger='contextMenu'
                placement='bottom'
                content={(
                    <>
                        <Tooltip title={`${nextRegularText}`} mouseLeaveDelay={0}>
                            <Icon
                                className='cvat-player-next-inlined-button'
                                component={NextIcon}
                                onClick={() => {
                                    setNextButton('regular');
                                }}
                            />
                        </Tooltip>
                        <Tooltip title={`${nextFilteredText}`} mouseLeaveDelay={0}>
                            <Icon
                                className='cvat-player-next-filtered-inlined-button'
                                component={NextFilteredIcon}
                                onClick={() => {
                                    setNextButton('filtered');
                                }}
                            />
                        </Tooltip>
                        <Tooltip title={`${nextEmptyText}`} mouseLeaveDelay={0}>
                            <Icon
                                className='cvat-player-next-empty-inlined-button'
                                component={NextEmptyIcon}
                                onClick={() => {
                                    setNextButton('empty');
                                }}
                            />
                        </Tooltip>
                    </>
                )}
            >
                <Tooltip placement='top' mouseLeaveDelay={0} title={`${nextButtonTooltipMessage} ${nextFrameShortcut}`}>
                    {nextButton}
                </Tooltip>
            </Popover>
            <Tooltip title={`Go next with a step ${forwardShortcut}`} mouseLeaveDelay={0}>
                <Icon className='cvat-player-forward-button' component={ForwardJumpIcon} onClick={onForward} />
            </Tooltip>
            <Tooltip title='Go to the last frame' mouseLeaveDelay={0}>
                <Icon className='cvat-player-last-button' component={LastIcon} onClick={onLastFrame} />
            </Tooltip>
        </Col>
    );
}

export default React.memo(PlayerButtons);
