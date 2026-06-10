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

const AUDIO_SHORT_JUMP_FRACTION = 0.005;
const AUDIO_LONG_JUMP_FRACTION = 0.05;

interface Props {
    playing: boolean;
    currentTime: number;
    duration: number;
    zoom: number;
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

type SeekButton = {
    title: string;
    className: string;
    icon: React.ComponentType;
    getTarget(currentTime: number, duration: number, shortJump: number, longJump: number): number;
};

const LEFT_BUTTONS: SeekButton[] = [
    {
        title: 'Jump to start',
        className: 'cvat-player-begin-button',
        icon: FirstIcon,
        getTarget: () => 0,
    },
    {
        title: 'long-backward',
        className: 'cvat-player-long-jump-backward-button',
        icon: BackJumpIcon,
        getTarget: (t, _duration, _shortJump, longJump) => t - longJump,
    },
    {
        title: 'short-backward',
        className: 'cvat-player-short-jump-backward-button',
        icon: PreviousIcon,
        getTarget: (t, _duration, shortJump) => t - shortJump,
    },
];

const RIGHT_BUTTONS: SeekButton[] = [
    {
        title: 'short-forward',
        className: 'cvat-player-short-jump-forward-button',
        icon: NextIcon,
        getTarget: (t, _duration, shortJump) => t + shortJump,
    },
    {
        title: 'long-forward',
        className: 'cvat-player-long-jump-forward-button',
        icon: ForwardJumpIcon,
        getTarget: (t, _duration, _shortJump, longJump) => t + longJump,
    },
    {
        title: 'Jump to end',
        className: 'cvat-player-end-button',
        icon: LastIcon,
        getTarget: (_, d) => d,
    },
];

function computeJumpSize(duration: number, zoom: number, fraction: number): number {
    if (duration <= 0) return 0;
    const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    return (duration / safeZoom) * fraction;
}

function AudioPlayerNavigation(props: Props): JSX.Element {
    const {
        playing,
        currentTime,
        duration,
        zoom,
        workspace,
        keyMap,
        onPlayPause,
        onSeek,
    } = props;

    const isAudioLoaded = duration > 0;
    const shortJump = computeJumpSize(duration, zoom, AUDIO_SHORT_JUMP_FRACTION);
    const longJump = computeJumpSize(duration, zoom, AUDIO_LONG_JUMP_FRACTION);
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
                seekTo(currentTime - shortJump);
            }
        },
        AUDIO_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seekTo(currentTime + shortJump);
            }
        },
        AUDIO_FAST_BACKWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seekTo(currentTime - longJump);
            }
        },
        AUDIO_FAST_FORWARD: (event: KeyboardEvent) => {
            event.preventDefault();
            if (workspace === Workspace.AUDIO) {
                seekTo(currentTime + longJump);
            }
        },
    };

    const renderSeekButton = ({
        title, icon, getTarget, className,
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
                    onClick={() => seekTo(getTarget(currentTime, duration, shortJump, longJump))}
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
