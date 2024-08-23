// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { GroupIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
    resetGroup(): void;
    canvasInstance: Canvas | Canvas3d;
    activeControl: ActiveControl;
    disabled?: boolean;
}

const componentShortcuts = {
    SWITCH_GROUP_MODE_STANDARD_CONTROLS: {
        name: 'Group mode',
        description: 'Activate or deactivate mode to grouping shapes',
        sequences: ['g'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    RESET_GROUP_STANDARD_CONTROLS: {
        name: 'Reset group',
        description: 'Reset group for selected shapes (in group mode)',
        sequences: ['shift+g'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_GROUP_MODE_STANDARD_3D_CONTROLS: {
        name: 'Group mode',
        description: 'Activate or deactivate mode to grouping shapes',
        sequences: ['g'],
        scope: ShortcutScope.STANDARD_3D_WORKSPACE_CONTROLS,
    },
    RESET_GROUP_STANDARD_3D_CONTROLS: {
        name: 'Reset group',
        description: 'Reset group for selected shapes (in group mode)',
        sequences: ['shift+g'],
        scope: ShortcutScope.STANDARD_3D_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function GroupControl(props: Props): JSX.Element {
    const {
        updateActiveControl,
        resetGroup,
        activeControl,
        canvasInstance,
        disabled,
    } = props;

    const { keyMap, normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const dynamicIconProps =
        activeControl === ActiveControl.GROUP ?
            {
                className: 'cvat-group-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.group({ enabled: false });
                    updateActiveControl(ActiveControl.CURSOR);
                },
            } :
            {
                className: 'cvat-group-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.group({ enabled: true });
                    updateActiveControl(ActiveControl.GROUP);
                },
            };

    const handleSwitchGroupMode = (event: KeyboardEvent | undefined): void => {
        if (event) event.preventDefault();
        dynamicIconProps.onClick();
    };

    const handleResetGroup = (event: KeyboardEvent | undefined): void => {
        if (event) event.preventDefault();
        const grouping = activeControl === ActiveControl.GROUP;
        if (!grouping) {
            return;
        }
        resetGroup();
        canvasInstance.group({ enabled: false });
        updateActiveControl(ActiveControl.CURSOR);
    };

    const handlers: Partial<Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void>> = {
        SWITCH_GROUP_MODE_STANDARD_CONTROLS: handleSwitchGroupMode,
        RESET_GROUP_STANDARD_CONTROLS: handleResetGroup,
        SWITCH_GROUP_MODE_STANDARD_3D_CONTROLS: handleSwitchGroupMode,
        RESET_GROUP_STANDARD_3D_CONTROLS: handleResetGroup,
    };

    const title = [
        `Group shapes/tracks ${normalizedKeyMap.SWITCH_GROUP_MODE_STANDARD_CONTROLS}`,
        `Select and press ${normalizedKeyMap.RESET_GROUP_STANDARD_CONTROLS} to reset a group.`,
    ].join(' ');

    return disabled ? (
        <Icon className='cvat-group-control cvat-disabled-canvas-control' component={GroupIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip title={title} placement='right'>
                <Icon {...dynamicIconProps} component={GroupIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(GroupControl);
