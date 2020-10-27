// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';

import { GroupIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    switchGroupShortcut: string;
    resetGroupShortcut: string;
    groupObjects(enabled: boolean): void;
}

function GroupControl(props: Props): JSX.Element {
    const { switchGroupShortcut, resetGroupShortcut, activeControl, canvasInstance, groupObjects } = props;

    const dynamicIconProps =
        activeControl === ActiveControl.GROUP
            ? {
                  className: 'cvat-group-control cvat-active-canvas-control',
                  onClick: (): void => {
                      canvasInstance.group({ enabled: false });
                      groupObjects(false);
                  },
              }
            : {
                  className: 'cvat-group-control',
                  onClick: (): void => {
                      canvasInstance.cancel();
                      canvasInstance.group({ enabled: true });
                      groupObjects(true);
                  },
              };

    const title =
        `Group shapes/tracks ${switchGroupShortcut}.` + ` Select and press ${resetGroupShortcut} to reset a group`;
    return (
        <Tooltip title={title} placement='right' mouseLeaveDelay={0}>
            <Icon {...dynamicIconProps} component={GroupIcon} />
        </Tooltip>
    );
}

export default React.memo(GroupControl);
