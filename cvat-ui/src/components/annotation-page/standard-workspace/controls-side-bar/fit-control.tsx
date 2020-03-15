// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Icon,
    Tooltip,
} from 'antd';

import {
    FitIcon,
} from 'icons';

import {
    Canvas,
} from 'cvat-canvas';

interface Props {
    canvasInstance: Canvas;
}

function FitControl(props: Props): JSX.Element {
    const {
        canvasInstance,
    } = props;

    return (
        <Tooltip title='Fit the image' placement='right'>
            <Icon component={FitIcon} onClick={(): void => canvasInstance.fit()} />
        </Tooltip>
    );
}

export default React.memo(FitControl);
