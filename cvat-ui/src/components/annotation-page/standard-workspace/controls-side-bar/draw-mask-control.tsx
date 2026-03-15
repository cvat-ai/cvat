// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import { BrushIcon } from 'icons';
import { ShapeType } from 'cvat-core-wrapper';

import CVATTooltip from 'components/common/cvat-tooltip';
import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';
import withVisibilityHandling from './handle-popover-visibility';

export interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
    disabled?: boolean;
}

const CustomPopover = withVisibilityHandling(Popover, 'draw-mask');
function DrawPointsControl(props: Props): JSX.Element {
    const { canvasInstance, isDrawing, disabled } = props;
    const tooltip = 'Draw a mask';
    const dynamicPopoverProps = isDrawing ? {
        overlayStyle: {
            display: 'none',
        },
    } : {};

    const dynamicIconProps = isDrawing ? {
        className: 'cvat-draw-mask-control cvat-active-canvas-control',
        onClick: (): void => {
            canvasInstance.draw({ enabled: false });
        },
    } : {
        className: 'cvat-draw-mask-control',
    };

    return disabled ? (
        <Icon className='cvat-draw-mask-control cvat-disabled-canvas-control' component={BrushIcon} />
    ) : (
        <CustomPopover
            {...dynamicPopoverProps}
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={<DrawShapePopoverContainer shapeType={ShapeType.MASK} />}
        >
            <CVATTooltip title={tooltip} placement='right'>
                <Icon {...dynamicIconProps} component={BrushIcon} />
            </CVATTooltip>
        </CustomPopover>
    );
}

export default React.memo(DrawPointsControl);
