import React from 'react';
import {
    Popover,
    Icon,
} from 'antd';

import { Canvas } from 'cvat-canvas';
import { PointIcon } from 'icons';
import {
    ShapeType,
    ActiveControl,
} from 'reducers/interfaces';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
}

export default function DrawRectangleControl(props: Props): JSX.Element {
    const {
        canvasInstance,
        activeControl,
    } = props;

    const dynamcPopoverPros = activeControl === ActiveControl.DRAW_POINTS
        ? {
            overlayStyle: {
                display: 'none',
            },
        } : {};

    const dynamicIconProps = activeControl === ActiveControl.DRAW_POINTS
        ? {
            className: 'cvat-annotation-page-active-control',
            onClick: (): void => {
                canvasInstance.draw({ enabled: false });
            },
        } : {};

    return (
        <Popover
            {...dynamcPopoverPros}
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={(
                <DrawShapePopoverContainer shapeType={ShapeType.POINTS} />
            )}
        >
            <Icon
                {...dynamicIconProps}
                component={PointIcon}
            />
        </Popover>
    );
}
