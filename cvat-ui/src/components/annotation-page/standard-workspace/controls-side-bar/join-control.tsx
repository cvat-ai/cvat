// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { JoinIcon } from 'icons';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
    canvasInstance: Canvas;
    disabled?: boolean;
    activeControl: ActiveControl;
}

const componentShortcuts = {
    SWITCH_JOIN_MODE_STANDARD_CONTROLS: {
        name: 'Join mode',
        description: 'Activate or deactivate a mode where you can join masks',
        sequences: ['j'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function JoinControl(props: Props): JSX.Element {
    const {
        updateActiveControl,
        canvasInstance,
        activeControl,
        disabled,
    } = props;

    const { keyMap, normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const dynamicIconProps =
        activeControl === ActiveControl.JOIN ?
            {
                className: 'cvat-join-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.join({ enabled: false });
                },
            } :
            {
                className: 'cvat-join-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.join({ enabled: true });
                    updateActiveControl(ActiveControl.JOIN);
                },
            };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SWITCH_JOIN_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicIconProps.onClick();
        },
    };

    return disabled ? (
        <Icon className='cvat-join-control cvat-disabled-canvas-control' component={JoinIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip title={`Join masks ${normalizedKeyMap.SWITCH_JOIN_MODE_STANDARD_CONTROLS}`} placement='right'>
                <Icon {...dynamicIconProps} component={JoinIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(JoinControl);
