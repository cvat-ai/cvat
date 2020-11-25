// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';

import { Canvas } from 'cvat-canvas-wrapper';
import { TagIcon } from 'icons';

import SetupTagPopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/setup-tag-popover';

interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
}

function SetupTagControl(props: Props): JSX.Element {
    const { isDrawing } = props;

    const dynamcPopoverPros = isDrawing
        ? {
              overlayStyle: {
                  display: 'none',
              },
          }
        : {};

    return (
        <Popover
            {...dynamcPopoverPros}
            placement='right'
            overlayClassName='cvat-draw-shape-popover'
            content={<SetupTagPopoverContainer />}
        >
            <Icon className='cvat-setup-tag-control' component={TagIcon} />
        </Popover>
    );
}

export default React.memo(SetupTagControl);
