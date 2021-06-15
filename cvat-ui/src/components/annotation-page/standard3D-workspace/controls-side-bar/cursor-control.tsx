// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { CursorIcon } from 'icons';
import { ActiveControl } from 'reducers/interfaces';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    canvasInstance: Canvas;
    cursorShortkey: string;
    activeControl: ActiveControl;
}

function CursorControl(props: Props): JSX.Element {
    const { activeControl, cursorShortkey, canvasInstance } = props;

    return (
        <CVATTooltip title={`Cursor ${cursorShortkey}`} placement='right'>
            <Icon
                component={CursorIcon}
                className={[
                    'cvat-cursor-control',
                    activeControl === ActiveControl.CURSOR ? 'cvat-active-canvas-control ' : '',
                ].join(' ')}
                onClick={activeControl !== ActiveControl.CURSOR ? (): void => canvasInstance.cancel() : undefined}
            />
        </CVATTooltip>
    );
}

export default React.memo(CursorControl);
