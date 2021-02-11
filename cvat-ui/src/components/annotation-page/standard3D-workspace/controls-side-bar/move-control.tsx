// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { MoveIcon } from 'icons';
import { ActiveControl } from 'reducers/interfaces';
import CVATTooltip from 'components/common/cvat-tooltip';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
}

function MoveControl(props: Props): JSX.Element {
    const { activeControl } = props;

    return (
        <CVATTooltip title='Move the image' placement='right'>
            <Icon
                component={MoveIcon}
                className={[
                    'cvat-move-control',
                    activeControl === ActiveControl.DRAG_CANVAS ? 'cvat-active-canvas-control' : '',
                ].join(' ')}
            />
        </CVATTooltip>
    );
}

export default React.memo(MoveControl);
