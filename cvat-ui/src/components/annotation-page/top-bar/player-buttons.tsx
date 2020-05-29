// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import {
    FirstIcon,
    BackJumpIcon,
    PreviousIcon,
    PlayIcon,
    PauseIcon,
    NextIcon,
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
    onSwitchPlay(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
}

function PlayerButtons(props: Props): JSX.Element {
    const {
        playing,
        playPauseShortcut,
        nextFrameShortcut,
        previousFrameShortcut,
        forwardShortcut,
        backwardShortcut,
        onSwitchPlay,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
    } = props;

    return (
        <Col className='cvat-player-buttons'>
            <Tooltip title='Go to the first frame'>
                <Icon component={FirstIcon} onClick={onFirstFrame} />
            </Tooltip>
            <Tooltip title={`Go back with a step ${backwardShortcut}`}>
                <Icon component={BackJumpIcon} onClick={onBackward} />
            </Tooltip>
            <Tooltip title={`Go back ${previousFrameShortcut}`}>
                <Icon component={PreviousIcon} onClick={onPrevFrame} />
            </Tooltip>

            {!playing
                ? (
                    <Tooltip title={`Play ${playPauseShortcut}`}>
                        <Icon
                            component={PlayIcon}
                            onClick={onSwitchPlay}
                        />
                    </Tooltip>
                )
                : (
                    <Tooltip title={`Pause ${playPauseShortcut}`}>
                        <Icon
                            component={PauseIcon}
                            onClick={onSwitchPlay}
                        />
                    </Tooltip>
                )}

            <Tooltip title={`Go next ${nextFrameShortcut}`}>
                <Icon component={NextIcon} onClick={onNextFrame} />
            </Tooltip>
            <Tooltip title={`Go next with a step ${forwardShortcut}`}>
                <Icon component={ForwardJumpIcon} onClick={onForward} />
            </Tooltip>
            <Tooltip title='Go to the last frame'>
                <Icon component={LastIcon} onClick={onLastFrame} />
            </Tooltip>
        </Col>
    );
}

export default React.memo(PlayerButtons);
