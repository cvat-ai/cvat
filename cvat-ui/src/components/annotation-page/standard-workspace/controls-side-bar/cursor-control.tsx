// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { CursorIcon } from 'icons';
import { ActiveControl } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { useRegisterShortcuts } from 'utils/hooks';

export interface Props {
    canvasInstance: Canvas | Canvas3d;
    cursorShortkey: string;
    activeControl: ActiveControl;
    shortcuts: {
        CANCEL: {
            details: KeyMapItem;
            displayValue: string;
        };
    }
}

const componentShortcuts = {
    CANCEL: {
        name: 'Cancel',
        description: 'Cancel any active canvas mode',
        sequences: ['esc'],
        scope: ShortcutScope.ALL,
    },
};

useRegisterShortcuts(componentShortcuts);

function CursorControl(props: Props): JSX.Element {
    const {
        canvasInstance, activeControl, cursorShortkey, shortcuts,
    } = props;

    const handler = (): void => {
        if (activeControl !== ActiveControl.CURSOR) {
            canvasInstance.cancel();
        }
    };

    return (
        <>
            <GlobalHotKeys
                keyMap={{ CANCEL: shortcuts.CANCEL.details }}
                handlers={{
                    CANCEL: (event: KeyboardEvent | undefined) => {
                        if (event) event.preventDefault();
                        handler();
                    },
                }}
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

export default React.memo(CursorControl);
