// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { CursorIcon } from 'icons';
import { ActiveControl, CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

export interface Props {
    cursorShortkey: string;
    activeControl: ActiveControl;
    updateActiveControl(activeControl: ActiveControl): void;
}

const componentShortcuts = {
    CANCEL_AUDIO: {
        name: 'Cancel',
        description: 'Cancel any active audio control mode',
        sequences: ['esc'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function AudioCursorControl(props: Props): JSX.Element {
    const { activeControl, cursorShortkey, updateActiveControl } = props;
    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const handler = (): void => {
        if (activeControl !== ActiveControl.CURSOR) {
            updateActiveControl(ActiveControl.CURSOR);
        }
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        CANCEL_AUDIO: (event?: KeyboardEvent) => {
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
            <CVATTooltip title={`Cursor ${cursorShortkey}`} placement='right'>
                <Icon
                    component={CursorIcon}
                    className={
                        activeControl === ActiveControl.CURSOR ?
                            'cvat-active-canvas-control cvat-cursor-control' :
                            'cvat-cursor-control'
                    }
                    onClick={handler}
                />
            </CVATTooltip>
        </>
    );
}

export default React.memo(AudioCursorControl);
