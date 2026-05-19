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
        sequences: ['left'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FORWARD: {
        name: 'Audio forward',
        description: 'Forward audio by 5 seconds',
        sequences: ['right'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FAST_BACKWARD: {
        name: 'Audio fast backward',
        description: 'Rewind audio by 30 seconds',
        sequences: ['alt+left'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
    AUDIO_FAST_FORWARD: {
        name: 'Audio fast forward',
        description: 'Forward audio by 30 seconds',
        sequences: ['alt+right'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

const getButtonStyle = (enabled: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    padding: '4px 6px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? '#374151' : '#9ca3af',
    fontSize: 12,
});

type SeekButton = {
    title: string;
    icon: React.ComponentType;
    getTarget(currentTime: number, duration: number): number;
};

const LEFT_BUTTONS: SeekButton[] = [
    { title: 'Jump to start', icon: FirstIcon, getTarget: () => 0 },
    { title: '-30 seconds', icon: BackJumpIcon, getTarget: (t) => t - 30 },
    { title: '-10 seconds', icon: PreviousIcon, getTarget: (t) => t - 10 },
];

const RIGHT_BUTTONS: SeekButton[] = [
    { title: '+10 seconds', icon: NextIcon, getTarget: (t) => t + 10 },
    { title: '+30 seconds', icon: ForwardJumpIcon, getTarget: (t) => t + 30 },
    { title: 'Jump to end', icon: LastIcon, getTarget: (_, d) => d },
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
    const buttonStyle = getButtonStyle(isAudioLoaded);

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

    const renderSeekButton = ({ title, icon, getTarget }: SeekButton): JSX.Element => (
        <CVATTooltip key={title} title={title}>
            <Icon
                style={buttonStyle}
                className='cvat-player-backward-button'
                component={icon}
                onClick={() => seekTo(getTarget(currentTime, duration))}
                disabled={!isAudioLoaded}
            />
        </CVATTooltip>
    );

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={hotkeyHandlers} />
            <Row align='middle' justify='center' style={{ gap: '15px', width: '100%' }}>
                <Col>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {LEFT_BUTTONS.map(renderSeekButton)}
                        <CVATTooltip title='Pause/Play'>
                            <Icon
                                style={buttonStyle}
                                className='cvat-player-backward-button'
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
