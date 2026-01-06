// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { FitIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

export interface Props {
    canvasInstance: Canvas;
}

function FitControl(props: Props): JSX.Element {
    const { canvasInstance } = props;

    return (
        <CVATTooltip title='适应图像 [双击]' placement='right'>
            <Icon className='cvat-fit-control' component={FitIcon} onClick={(): void => canvasInstance.fit()} />
        </CVATTooltip>
    );
}

export default React.memo(FitControl);

