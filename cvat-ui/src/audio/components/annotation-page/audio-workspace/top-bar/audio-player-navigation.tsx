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
import type { AudioSeekRequest } from 'actions/audio-actions';
import {
    BackJumpIcon, FirstIcon, ForwardJumpIcon, LastIcon,
    NextIcon, PauseIcon, PlayIcon, PreviousIcon,
} from 'icons';

interface Props {
    playing: boolean;
    duration: number;
    workspace: Workspace;
    keyMap: KeyMap;
    playPauseShortcut: string;
    backwardShortcut: string;
    forwardShortcut: string;
    fastBackwardShortcut: string;
    fastForwardShortcut: string;
    onPlayPause(): void;
    onSeek(request: AudioSeekRequest): void;
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
        description: 'Rewind audio by a short step',
        sequences: ['d'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FORWARD: {
        name: 'Audio forward',
        description: 'Forward audio by a short step',
        sequences: ['f'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FAST_BACKWARD: {
        name: 'Audio fast backward',
        description: 'Rewind audio by a long step',
        sequences: ['c'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FAST_FORWARD: {
        name: 'Audio fast forward',
        description: 'Forward audio by a long step',
        sequences: ['v'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

const AUDIO_SHORT_JUMP_FRACTION = 0.005;
const AUDIO_LONG_JUMP_FRACTION = 0.05;

const AUDIO_SEEK_REQUESTS = {
    START: { kind: 'boundary', boundary: 'start' },
    SHORT_BACKWARD: { kind: 'visible-range-offset', fraction: -AUDIO_SHORT_JUMP_FRACTION },
    LONG_BACKWARD: { kind: 'visible-range-offset', fraction: -AUDIO_LONG_JUMP_FRACTION },
    SHORT_FORWARD: { kind: 'visible-range-offset', fraction: AUDIO_SHORT_JUMP_FRACTION },
    LONG_FORWARD: { kind: 'visible-range-offset', fraction: AUDIO_LONG_JUMP_FRACTION },
    END: { kind: 'boundary', boundary: 'end' },
} as const satisfies Record<string, AudioSeekRequest>;

type SeekButton = {
    title: string;
    className: string;
    icon: React.ComponentType;
    request: AudioSeekRequest;
    shortcut?: keyof Pick<Props, 'backwardShortcut' | 'forwardShortcut' | 'fastBackwardShortcut' | 'fastForwardShortcut'>;
};

const LEFT_BUTTONS: SeekButton[] = [
    {
        title: 'Jump to start',
        className: 'cvat-player-begin-button',
        icon: FirstIcon,
        request: AUDIO_SEEK_REQUESTS.START,
    },
    {
        title: 'long-backward',
        className: 'cvat-player-long-jump-backward-button',
        icon: BackJumpIcon,
        request: AUDIO_SEEK_REQUESTS.LONG_BACKWARD,
        shortcut: 'fastBackwardShortcut',
    },
    {
        title: 'short-backward',
        className: 'cvat-player-short-jump-backward-button',
        icon: PreviousIcon,
        request: AUDIO_SEEK_REQUESTS.SHORT_BACKWARD,
        shortcut: 'backwardShortcut',
    },
];

const RIGHT_BUTTONS: SeekButton[] = [
    {
        title: 'short-forward',
        className: 'cvat-player-short-jump-forward-button',
        icon: NextIcon,
        request: AUDIO_SEEK_REQUESTS.SHORT_FORWARD,
        shortcut: 'forwardShortcut',
    },
    {
        title: 'long-forward',
        className: 'cvat-player-long-jump-forward-button',
        icon: ForwardJumpIcon,
        request: AUDIO_SEEK_REQUESTS.LONG_FORWARD,
        shortcut: 'fastForwardShortcut',
    },
    {
        title: 'Jump to end',
        className: 'cvat-player-end-button',
        icon: LastIcon,
        request: AUDIO_SEEK_REQUESTS.END,
    },
];

function AudioPlayerNavigation(props: Props): JSX.Element {
    const {
        playing,
        duration,
        workspace,
        keyMap,
        playPauseShortcut,
        backwardShortcut,
        forwardShortcut,
        fastBackwardShortcut,
        fastForwardShortcut,
        onPlayPause,
        onSeek,
    } = props;

    const isAudioLoaded = duration > 0;
    const seek = (request: AudioSeekRequest): void => {
        if (isAudioLoaded) onSeek(request);
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
                seek(AUDIO_SEEK_REQUESTS.SHORT_BACKWARD);
            }
        },
        AUDIO_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seek(AUDIO_SEEK_REQUESTS.SHORT_FORWARD);
            }
        },
        AUDIO_FAST_BACKWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seek(AUDIO_SEEK_REQUESTS.LONG_BACKWARD);
            }
        },
        AUDIO_FAST_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seek(AUDIO_SEEK_REQUESTS.LONG_FORWARD);
            }
        },
    };

    const renderSeekButton = ({
        title, icon, request, className, shortcut,
    }: SeekButton): JSX.Element => {
        let tooltip = title;
        if (title === 'short-backward') tooltip = 'Short step backward';
        if (title === 'short-forward') tooltip = 'Short step forward';
        if (title === 'long-backward') tooltip = 'Long step backward';
        if (title === 'long-forward') tooltip = 'Long step forward';

        const shortcutValue = shortcut ? {
            backwardShortcut,
            forwardShortcut,
            fastBackwardShortcut,
            fastForwardShortcut,
        }[shortcut] : '';

        return (
            <CVATTooltip key={title} title={`${tooltip} ${shortcutValue}`}>
                <Icon
                    className={className}
                    component={icon}
                    onClick={() => seek(request)}
                    disabled={!isAudioLoaded}
                />
            </CVATTooltip>
        );
    };

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
                        <CVATTooltip title={`${playing ? 'Pause' : 'Play'} ${playPauseShortcut}`}>
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
