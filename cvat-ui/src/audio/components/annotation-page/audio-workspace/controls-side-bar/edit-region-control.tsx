// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { IntervalEditIcon } from 'icons';
import { ActiveControl, CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

export interface Props {
    activeControl: ActiveControl;
    editRegionShortkey: string;
    updateActiveControl(activeControl: ActiveControl): void;
}

const componentShortcuts = {
    EDIT_AUDIO_REGION: {
        name: 'Edit audio interval',
        description: 'Enable audio interval editing mode — drag or resize existing intervals',
        sequences: ['e'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function EditRegionControl(props: Props): JSX.Element {
    const { activeControl, editRegionShortkey, updateActiveControl } = props;
    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const isActive = activeControl === ActiveControl.AUDIO_REGION_EDIT;

    const handler = (): void => {
        updateActiveControl(
            isActive ? ActiveControl.CURSOR : ActiveControl.AUDIO_REGION_EDIT,
        );
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        EDIT_AUDIO_REGION: (event?: KeyboardEvent) => {
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
            <CVATTooltip title={`Edit intervals ${editRegionShortkey}`} placement='right'>
                <Icon
                    component={IntervalEditIcon}
                    className={
                        isActive ?
                            'cvat-active-canvas-control cvat-audio-edit-region-control' :
                            'cvat-audio-edit-region-control'
                    }
                    onClick={handler}
                />
            </CVATTooltip>
        </>
    );
}

export default React.memo(EditRegionControl);
