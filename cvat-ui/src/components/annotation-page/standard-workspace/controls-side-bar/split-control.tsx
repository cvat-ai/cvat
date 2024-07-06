// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { SplitIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { useSelector } from 'react-redux';
import { subKeyMap } from 'utils/component-subkeymap';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
    canvasInstance: Canvas | Canvas3d;
    activeControl: ActiveControl;
    disabled?: boolean;
    shortcuts: {
        SWITCH_SPLIT_MODE: {
            details: KeyMapItem;
            displayValue: string;
        };
    };
}

const componentShortcuts = {
    SWITCH_SPLIT_MODE: {
        name: 'Split mode',
        description: 'Activate or deactivate mode to splitting shapes',
        sequences: ['alt+m'],
        scope: ShortcutScope.ALL,
    },
};

registerComponentShortcuts(componentShortcuts);

function SplitControl(props: Props): JSX.Element {
    const {
        shortcuts, activeControl, canvasInstance, updateActiveControl, disabled,
    } = props;

    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const dynamicIconProps = activeControl === ActiveControl.SPLIT ?
        {
            className: 'cvat-split-track-control cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.split({ enabled: false });
            },
        } :
        {
            className: 'cvat-split-track-control',
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.split({ enabled: true });
                updateActiveControl(ActiveControl.SPLIT);
            },
        };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SWITCH_SPLIT_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicIconProps.onClick();
        },
    };

    return disabled ? (
        <Icon className='cvat-split-track-control cvat-disabled-canvas-control' component={SplitIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip title={`Split a track ${shortcuts.SWITCH_SPLIT_MODE.displayValue}`} placement='right'>
                <Icon {...dynamicIconProps} component={SplitIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(SplitControl);
