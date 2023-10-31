// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { GroupIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

export interface Props {
    joinShapes(enabled: boolean): void;
    canvasInstance: Canvas;
    disabled?: boolean;
    activeControl: ActiveControl;
    shortcuts: {
        SWITCH_JOIN_MODE: {
            details: KeyMapItem;
            displayValue: string;
        };
    }
}

function JoinControl(props: Props): JSX.Element {
    const {
        joinShapes,
        canvasInstance,
        activeControl,
        disabled,
        shortcuts,
    } = props;

    const dynamicIconProps =
        activeControl === ActiveControl.JOIN ?
            {
                className: 'cvat-join-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.join({ enabled: false });
                    joinShapes(false);
                },
            } :
            {
                className: 'cvat-join-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.join({ enabled: true });
                    joinShapes(true);
                },
            };

    const shortcutHandlers = {
        SWITCH_JOIN_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicIconProps.onClick();
        },
    };

    return disabled ? (
        <Icon className='cvat-group-control cvat-disabled-canvas-control' component={GroupIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={{
                    SWITCH_GROUP_MODE: shortcuts.SWITCH_JOIN_MODE.details,
                    RESET_GROUP: shortcuts.SWITCH_JOIN_MODE.details,
                }}
                handlers={shortcutHandlers}
            />
            <CVATTooltip title='Join masks' placement='right'>
                <Icon {...dynamicIconProps} component={GroupIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(JoinControl);
