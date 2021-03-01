// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { CursorIcon } from 'icons';
import { ActiveControl } from 'reducers/interfaces';
import { Canvas } from 'cvat-canvas-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    canvasInstance: Canvas;
    cursorShortkey: string;
    activeControl: ActiveControl;
}

function CursorControl(props: Props): JSX.Element {
    const { canvasInstance, activeControl, cursorShortkey } = props;

    return (
        <CVATTooltip title={`Cursor ${cursorShortkey}`} placement='right'>
            <Icon
                component={CursorIcon}
                className={
                    activeControl === ActiveControl.CURSOR ?
                        'cvat-active-canvas-control cvat-cursor-control' :
                        'cvat-cursor-control'
                }
                onClick={activeControl !== ActiveControl.CURSOR ? (): void => canvasInstance.cancel() : undefined}
            />
        </CVATTooltip>
    );
}

export default React.memo(CursorControl);
