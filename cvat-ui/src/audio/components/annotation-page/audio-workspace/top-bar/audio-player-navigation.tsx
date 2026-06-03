// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';

import { Workspace } from 'reducers';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    BackJumpIcon, FirstIcon, ForwardJumpIcon, LastIcon,
    NextIcon, PauseIcon, PlayIcon, PreviousIcon,
} from 'icons';

interface Props {
    playing: boolean;
    currentTime: number;
    duration: number;
    workspace: Workspace;
    keyMap: KeyMap;
    onPlayPause(): void;
    onSeek(time: number): void;
}

const componentShortcuts = {
    PLAY_PAUSE_AUDIO: {
        name: 'Play/Pause audio',
        description: 'Play or pause audio playback',
        sequences: ['space'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_BACKWARD: {
        name: 'Audio backward',
        description: 'Rewind audio by 5 seconds',
        sequences: ['d'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FORWARD: {
        name: 'Audio forward',
        description: 'Forward audio by 5 seconds',
        sequences: ['f'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FAST_BACKWARD: {
        name: 'Audio fast backward',
        description: 'Rewind audio by 30 seconds',
        sequences: ['c'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FAST_FORWARD: {
        name: 'Audio fast forward',
        description: 'Forward audio by 30 seconds',
        sequences: ['v'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

type SeekButton = {
    title: string;
    className: string;
    icon: React.ComponentType;
    getTarget(currentTime: number, duration: number): number;
};

const LEFT_BUTTONS: SeekButton[] = [
    {
        title: 'Jump to start',
        className: 'cvat-player-begin-button',
        icon: FirstIcon,
        getTarget: () => 0,
    },
    {
        title: '-30 seconds',
        className: 'cvat-player-long-jump-backward-button',
        icon: BackJumpIcon,
        getTarget: (t) => t - 30,
    },
    {
        title: '-10 seconds',
        className: 'cvat-player-short-jump-backward-button',
        icon: PreviousIcon,
        getTarget: (t) => t - 10,
    },
];

const RIGHT_BUTTONS: SeekButton[] = [
    {
        title: '+10 seconds',
        className: 'cvat-player-short-jump-forward-button',
        icon: NextIcon,
        getTarget: (t) => t + 10,
    },
    {
        title: '+30 seconds',
        className: 'cvat-player-long-jump-forward-button',
        icon: ForwardJumpIcon,
        getTarget: (t) => t + 30,
    },
    {
        title: 'Jump to end',
        className: 'cvat-player-end-button',
        icon: LastIcon,
        getTarget: (_, d) => d,
    },
];

function AudioPlayerNavigation(props: Props): JSX.Element {
    const {
        playing,
        currentTime,
        duration,
        workspace,
        keyMap,
        onPlayPause,
        onSeek,
    } = props;

    const isAudioLoaded = duration > 0;
    const seekTo = (time: number): void => {
        if (!isAudioLoaded) return;

        const clampedTime = Math.max(0, Math.min(duration, time));
        onSeek(clampedTime);
    };

    const hotkeyHandlers: { [key: string]: (event: KeyboardEvent) => void } = {
        PLAY_PAUSE_AUDIO: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                onPlayPause();
            }
        },
        AUDIO_BACKWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                onSeek(Math.max(0, currentTime - 5));
            }
        },
        AUDIO_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                onSeek(Math.min(duration, currentTime + 5));
            }
        },
        AUDIO_FAST_BACKWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                onSeek(Math.max(0, currentTime - 30));
            }
        },
        AUDIO_FAST_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                onSeek(Math.min(duration, currentTime + 30));
            }
        },
    };

    const renderSeekButton = ({
        title, icon, getTarget, className,
    }: SeekButton): JSX.Element => (
        <CVATTooltip key={title} title={title}>
            <Icon
                className={className}
                component={icon}
                onClick={() => seekTo(getTarget(currentTime, duration))}
                disabled={!isAudioLoaded}
            />
        </CVATTooltip>
    );

    const blockStyle = isAudioLoaded ? {} : {
        pointerEvents: 'none',
        cursor: 'not-allowed',
    } as const;

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={hotkeyHandlers} />
            <Row align='middle' justify='center'>
                <Col>
                    <div style={blockStyle} className='cvat-player-buttons'>
                        {LEFT_BUTTONS.map(renderSeekButton)}
                        <CVATTooltip title={playing ? 'Pause' : 'Play'}>
                            <Icon
                                className={playing ? 'cvat-player-pause-button' : 'cvat-player-play-button'}
                                component={playing ? PauseIcon : PlayIcon}
                                onClick={onPlayPause}
                                disabled={!isAudioLoaded}
                            />
                        </CVATTooltip>
                        {RIGHT_BUTTONS.map(renderSeekButton)}
                    </div>
                </Col>
            </Row>
        </>
    );
}

export default AudioPlayerNavigation;
