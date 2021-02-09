// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import { ShapeType } from 'reducers/interfaces';

import { CubeIcon } from 'icons';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';
import withVisibilityHandling from './handle-popover-visibility';

interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
}

const CustomPopover = withVisibilityHandling(Popover, 'draw-cuboid');
function DrawPolygonControl(props: Props): JSX.Element {
    const { canvasInstance, isDrawing } = props;
    const dynamcPopoverPros = isDrawing ?
        {
            overlayStyle: {
                display: 'none',
            },
        } :
        {};

    const dynamicIconProps = isDrawing ?
        {
            className: 'cvat-draw-cuboid-control cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.draw({ enabled: false });
            },
        } :
        {
            className: 'cvat-draw-cuboid-control',
        };

    return (
        <CustomPopover
            {...dynamcPopoverPros}
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={<DrawShapePopoverContainer shapeType={ShapeType.CUBOID} />}
        >
            <Icon {...dynamicIconProps} component={CubeIcon} />
        </CustomPopover>
    );
}

export default React.memo(DrawPolygonControl);
