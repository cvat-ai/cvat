// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { MergeIcon } from 'icons';
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
        SWITCH_MERGE_MODE: {
            details: KeyMapItem;
            displayValue: string;
        }
    };
}

const componentShortcuts = {
    SWITCH_MERGE_MODE: {
        name: 'Merge mode',
        description: 'Activate or deactivate mode to merging shapes',
        sequences: ['m'],
        scope: ShortcutScope.ALL,
    },
};

registerComponentShortcuts(componentShortcuts);

function MergeControl(props: Props): JSX.Element {
    const {
        shortcuts, activeControl, canvasInstance, updateActiveControl, disabled,
    } = props;

    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const dynamicIconProps =
        activeControl === ActiveControl.MERGE ?
            {
                className: 'cvat-merge-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.merge({ enabled: false });
                    updateActiveControl(ActiveControl.CURSOR);
                },
            } :
            {
                className: 'cvat-merge-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.merge({ enabled: true });
                    updateActiveControl(ActiveControl.MERGE);
                },
            };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SWITCH_MERGE_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicIconProps.onClick();
        },
    };

    return disabled ? (
        <Icon className='cvat-merge-control cvat-disabled-canvas-control' component={MergeIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip title={`Merge shapes/tracks ${shortcuts.SWITCH_MERGE_MODE.displayValue}`} placement='right'>
                <Icon {...dynamicIconProps} component={MergeIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(MergeControl);
