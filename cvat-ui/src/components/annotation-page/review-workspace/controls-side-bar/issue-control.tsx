// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import { ActiveControl } from 'reducers/interfaces';
import { Canvas } from 'cvat-canvas-wrapper';
import { RectangleIcon } from 'icons';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    selectIssuePosition(enabled: boolean): void;
}

function ResizeControl(props: Props): JSX.Element {
    const { activeControl, canvasInstance, selectIssuePosition } = props;

    return (
        <Tooltip title='Open an issue' placement='right' mouseLeaveDelay={0}>
            <Icon
                component={RectangleIcon}
                className={
                    activeControl === ActiveControl.OPEN_ISSUE ?
                        'cvat-issue-control cvat-active-canvas-control' :
                        'cvat-issue-control'
                }
                onClick={(): void => {
                    if (activeControl === ActiveControl.OPEN_ISSUE) {
                        canvasInstance.selectRegion(false);
                        selectIssuePosition(false);
                    } else {
                        canvasInstance.cancel();
                        canvasInstance.selectRegion(true);
                        selectIssuePosition(true);
                    }
                }}
            />
        </Tooltip>
    );
}

export default React.memo(ResizeControl);
