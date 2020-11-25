// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';

import { Canvas } from 'cvat-canvas-wrapper';
import { ShapeType } from 'reducers/interfaces';

import { CubeIcon } from 'icons';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';

interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
}

function DrawPolygonControl(props: Props): JSX.Element {
    const { canvasInstance, isDrawing } = props;

    const dynamcPopoverPros = isDrawing
        ? {
              overlayStyle: {
                  display: 'none',
              },
          }
        : {};

    const dynamicIconProps = isDrawing
        ? {
              className: 'cvat-active-canvas-control',
              onClick: (): void => {
                  canvasInstance.draw({ enabled: false });
              },
          }
        : {};

    return (
        <Popover
            {...dynamcPopoverPros}
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={<DrawShapePopoverContainer shapeType={ShapeType.CUBOID} />}
        >
            <Icon className='cvat-draw-cuboid-control' {...dynamicIconProps} component={CubeIcon} />
        </Popover>
    );
}

export default React.memo(DrawPolygonControl);
