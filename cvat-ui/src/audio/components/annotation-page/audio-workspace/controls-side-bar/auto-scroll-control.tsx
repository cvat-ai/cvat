// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Icon from '@ant-design/icons';

import { CombinedState } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { subKeyMap } from 'utils/component-subkeymap';
import { ShortcutScope } from 'utils/enums';
import { FollowPlaybackIcon } from 'icons';

export interface Props {
    autoScroll: boolean;
    onAutoScrollChange(autoScroll: boolean): void;
}

const componentShortcuts = {
    TOGGLE_AUDIO_AUTO_SCROLL: {
        name: 'Toggle auto-scroll waveform',
        description: 'Toggle auto-scroll waveform',
        sequences: ['w'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function AutoScrollControl({ autoScroll, onAutoScrollChange }: Props): JSX.Element {
    const { keyMap, normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const handler = (): void => {
        onAutoScrollChange(!autoScroll);
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        TOGGLE_AUDIO_AUTO_SCROLL: (event?: KeyboardEvent) => {
            if (event) event.preventDefault();
            handler();
        },
    };

    return (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip
                title={`Auto-scroll waveform${autoScroll ? ' (on)' : ''} ${normalizedKeyMap.TOGGLE_AUDIO_AUTO_SCROLL}`}
                placement='right'
            >
                <Icon
                    component={FollowPlaybackIcon}
                    className={autoScroll ?
                        'cvat-active-canvas-control cvat-audio-auto-scroll-control' :
                        'cvat-audio-auto-scroll-control'}
                    aria-label='Auto-scroll waveform'
                    aria-pressed={autoScroll}
                    onClick={handler}
                />
            </CVATTooltip>
        </>
    );
}

export default React.memo(AutoScrollControl);
