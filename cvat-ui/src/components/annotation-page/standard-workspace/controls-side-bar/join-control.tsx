// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { LinkOutlined } from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
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
        updateActiveControl,
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
                    updateActiveControl(ActiveControl.CURSOR);
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

    return disabled ? (
        <LinkOutlined className='cvat-group-control cvat-disabled-canvas-control' />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={{ SWITCH_JOIN_MODE: shortcuts.SWITCH_JOIN_MODE.details }}
                handlers={{
                    SWITCH_JOIN_MODE: (event: KeyboardEvent | undefined) => {
                        if (event) event.preventDefault();
                        dynamicIconProps.onClick();
                    },
                }}
            />
            <CVATTooltip title='Join masks' placement='right'>
                <LinkOutlined {...dynamicIconProps} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(JoinControl);
