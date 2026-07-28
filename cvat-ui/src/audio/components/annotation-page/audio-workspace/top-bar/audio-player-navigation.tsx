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
import { AudioSeekIntent } from 'actions/audio-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    BackJumpIcon, FirstIcon, ForwardJumpIcon, LastIcon,
    NextIcon, PauseIcon, PlayIcon, PreviousIcon,
} from 'icons';

interface Props {
    playing: boolean;
    duration: number;
    workspace: Workspace;
    keyMap: KeyMap;
    onPlayPause(): void;
    onSeek(intent: AudioSeekIntent): void;
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

const AUDIO_SEEK_INTENTS = {
    START: { kind: 'boundary', boundary: 'start' },
    SHORT_BACKWARD: { kind: 'step', direction: -1, size: 'short' },
    LONG_BACKWARD: { kind: 'step', direction: -1, size: 'long' },
    SHORT_FORWARD: { kind: 'step', direction: 1, size: 'short' },
    LONG_FORWARD: { kind: 'step', direction: 1, size: 'long' },
    END: { kind: 'boundary', boundary: 'end' },
} as const satisfies Record<string, AudioSeekIntent>;

type SeekButton = {
    title: string;
    className: string;
    icon: React.ComponentType;
    intent: AudioSeekIntent;
};

const LEFT_BUTTONS: SeekButton[] = [
    {
        title: 'Jump to start',
        className: 'cvat-player-begin-button',
        icon: FirstIcon,
        intent: AUDIO_SEEK_INTENTS.START,
    },
    {
        title: 'long-backward',
        className: 'cvat-player-long-jump-backward-button',
        icon: BackJumpIcon,
        intent: AUDIO_SEEK_INTENTS.LONG_BACKWARD,
    },
    {
        title: 'short-backward',
        className: 'cvat-player-short-jump-backward-button',
        icon: PreviousIcon,
        intent: AUDIO_SEEK_INTENTS.SHORT_BACKWARD,
    },
];

const RIGHT_BUTTONS: SeekButton[] = [
    {
        title: 'short-forward',
        className: 'cvat-player-short-jump-forward-button',
        icon: NextIcon,
        intent: AUDIO_SEEK_INTENTS.SHORT_FORWARD,
    },
    {
        title: 'long-forward',
        className: 'cvat-player-long-jump-forward-button',
        icon: ForwardJumpIcon,
        intent: AUDIO_SEEK_INTENTS.LONG_FORWARD,
    },
    {
        title: 'Jump to end',
        className: 'cvat-player-end-button',
        icon: LastIcon,
        intent: AUDIO_SEEK_INTENTS.END,
    },
];

function AudioPlayerNavigation(props: Props): JSX.Element {
    const {
        playing,
        duration,
        workspace,
        keyMap,
        onPlayPause,
        onSeek,
    } = props;

    const isAudioLoaded = duration > 0;
    const seek = (intent: AudioSeekIntent): void => {
        if (isAudioLoaded) onSeek(intent);
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
                seek(AUDIO_SEEK_INTENTS.SHORT_BACKWARD);
            }
        },
        AUDIO_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seek(AUDIO_SEEK_INTENTS.SHORT_FORWARD);
            }
        },
        AUDIO_FAST_BACKWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seek(AUDIO_SEEK_INTENTS.LONG_BACKWARD);
            }
        },
        AUDIO_FAST_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seek(AUDIO_SEEK_INTENTS.LONG_FORWARD);
            }
        },
    };

    const renderSeekButton = ({
        title, icon, intent, className,
    }: SeekButton): JSX.Element => {
        let tooltip = title;
        if (title === 'short-backward') tooltip = 'Short step backward';
        if (title === 'short-forward') tooltip = 'Short step forward';
        if (title === 'long-backward') tooltip = 'Long step backward';
        if (title === 'long-forward') tooltip = 'Long step forward';

        return (
            <CVATTooltip key={title} title={tooltip}>
                <Icon
                    className={className}
                    component={icon}
                    onClick={() => seek(intent)}
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
