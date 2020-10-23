// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';

import { Canvas } from 'cvat-canvas-wrapper';
import { PolylineIcon } from 'icons';
import { ShapeType } from 'reducers/interfaces';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';

interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
}

function DrawPolylineControl(props: Props): JSX.Element {
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
            content={<DrawShapePopoverContainer shapeType={ShapeType.POLYLINE} />}
        >
            <Icon className='cvat-draw-polyline-control' {...dynamicIconProps} component={PolylineIcon} />
        </Popover>
    );
}

export default React.memo(DrawPolylineControl);
