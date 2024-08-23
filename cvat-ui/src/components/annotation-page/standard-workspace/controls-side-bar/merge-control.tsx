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
import GlobalHotKeys from 'utils/mousetrap-react';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { useSelector } from 'react-redux';
import { subKeyMap } from 'utils/component-subkeymap';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
    canvasInstance: Canvas | Canvas3d;
    activeControl: ActiveControl;
    disabled?: boolean;
}

const componentShortcuts = {
    SWITCH_MERGE_MODE_STANDARD_CONTROLS: {
        name: 'Merge mode',
        description: 'Activate or deactivate mode to merging shapes',
        sequences: ['m'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_MERGE_MODE_STANDARD_3D_CONTROLS: {
        name: 'Merge mode',
        description: 'Activate or deactivate mode to merging shapes',
        sequences: ['m'],
        scope: ShortcutScope.STANDARD_3D_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function MergeControl(props: Props): JSX.Element {
    const {
        activeControl, canvasInstance, updateActiveControl, disabled,
    } = props;

    const { keyMap, normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

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

    const handleMergeMode = (event: KeyboardEvent | undefined): void => {
        if (event) event.preventDefault();
        dynamicIconProps.onClick();
    };

    const handlers: Partial<Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void>> = {
        SWITCH_MERGE_MODE_STANDARD_CONTROLS: canvasInstance instanceof Canvas3d ? undefined : handleMergeMode,
        SWITCH_MERGE_MODE_STANDARD_3D_CONTROLS: canvasInstance instanceof Canvas3d ? handleMergeMode : undefined,
    };

    return disabled ? (
        <Icon className='cvat-merge-control cvat-disabled-canvas-control' component={MergeIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <CVATTooltip title={`Merge shapes/tracks ${normalizedKeyMap.SWITCH_MERGE_MODE_STANDARD_CONTROLS}`} placement='right'>
                <Icon {...dynamicIconProps} component={MergeIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(MergeControl);
