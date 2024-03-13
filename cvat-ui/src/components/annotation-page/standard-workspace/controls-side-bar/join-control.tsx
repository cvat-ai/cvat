// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import { JoinIcon } from 'icons';

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
        <Icon className='cvat-join-control cvat-disabled-canvas-control' component={JoinIcon} />
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
            <CVATTooltip title={`Join masks ${shortcuts.SWITCH_JOIN_MODE.displayValue}`} placement='right'>
                <Icon {...dynamicIconProps} component={JoinIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(JoinControl);
