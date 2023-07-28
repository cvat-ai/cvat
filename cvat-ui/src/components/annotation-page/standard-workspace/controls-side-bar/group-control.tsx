// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { GroupIcon } from 'icons';
import { DimensionType } from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

export interface Props {
    groupObjects(enabled: boolean): void;
    resetGroup(): void;
    canvasInstance: Canvas | Canvas3d;
    activeControl: ActiveControl;
    disabled?: boolean;
    jobInstance?: any;
    shortcuts: {
        SWITCH_GROUP_MODE: {
            details: KeyMapItem;
            displayValue: string;
        };
        RESET_GROUP: {
            details: KeyMapItem;
            displayValue: string;
        };
    }
}

function GroupControl(props: Props): JSX.Element {
    const {
        groupObjects,
        resetGroup,
        activeControl,
        canvasInstance,
        disabled,
        jobInstance,
        shortcuts,
    } = props;

    const dynamicIconProps =
        activeControl === ActiveControl.GROUP ?
            {
                className: 'cvat-group-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.group({ enabled: false });
                    groupObjects(false);
                },
            } :
            {
                className: 'cvat-group-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.group({ enabled: true });
                    groupObjects(true);
                },
            };

    const title = [
        `Group shapes${
            jobInstance && jobInstance.dimension === DimensionType.DIMENSION_3D ? '' : '/tracks'
        } ${shortcuts.SWITCH_GROUP_MODE.displayValue}. `,
        `Select and press ${shortcuts.RESET_GROUP.displayValue} to reset a group.`,
    ].join(' ');

    const shortcutHandlers = {
        SWITCH_GROUP_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            const grouping = activeControl === ActiveControl.GROUP;
            if (!grouping) {
                canvasInstance.cancel();
            }
            canvasInstance.group({ enabled: !grouping });
            groupObjects(!grouping);
        },
        RESET_GROUP: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            const grouping = activeControl === ActiveControl.GROUP;
            if (!grouping) {
                return;
            }
            resetGroup();
            canvasInstance.group({ enabled: false });
            groupObjects(false);
        },
    };

    return disabled ? (
        <Icon className='cvat-group-control cvat-disabled-canvas-control' component={GroupIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={{
                    SWITCH_GROUP_MODE: shortcuts.SWITCH_GROUP_MODE.details,
                    RESET_GROUP: shortcuts.RESET_GROUP.details,
                }}
                handlers={shortcutHandlers}
            />
            <CVATTooltip title={title} placement='right'>
                <Icon {...dynamicIconProps} component={GroupIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(GroupControl);
