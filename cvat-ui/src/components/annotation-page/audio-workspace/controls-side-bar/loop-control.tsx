import React from 'react';
import { useSelector } from 'react-redux';
import Icon from '@ant-design/icons';
import { AudioLoopIcon } from 'icons';

import { CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';

export interface Props {
    loop: boolean;
    onLoopChange(loop: boolean): void;
}

const componentShortcuts = {
    TOGGLE_AUDIO_LOOP: {
        name: 'Toggle interval loop playback',
        description: 'Toggle loop playback for the active audio interval',
        sequences: ['r'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function LoopControl(props: Props): JSX.Element {
    const { loop, onLoopChange } = props;
    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const handler = (): void => {
        onLoopChange(!loop);
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        TOGGLE_AUDIO_LOOP: (event?: KeyboardEvent) => {
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
            <CVATTooltip title={`Loop interval playback${loop ? ' (on)' : ''} (R)`} placement='right'>
                <Icon
                    component={AudioLoopIcon}
                    className={
                        loop ?
                            'cvat-active-canvas-control cvat-audio-loop-control' :
                            'cvat-audio-loop-control'
                    }
                    onClick={handler}
                />
            </CVATTooltip>
        </>
    );
}

export default React.memo(LoopControl);
