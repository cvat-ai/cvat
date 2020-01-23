import React from 'react';
import {
    Popover,
    Icon,
} from 'antd';

import { Canvas } from 'cvat-canvas';
import { RectangleIcon } from 'icons';
import { ShapeType } from 'reducers/interfaces';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';

interface Props {
    canvasInstance: Canvas;
    isDrawing: boolean;
}

const DrawRectangleControl = React.memo((props: Props): JSX.Element => {
    const {
        canvasInstance,
        isDrawing,
    } = props;

    const dynamcPopoverPros = isDrawing ? {
        overlayStyle: {
            display: 'none',
        },
    } : {};

    const dynamicIconProps = isDrawing ? {
        className: 'cvat-active-canvas-control',
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
                <DrawShapePopoverContainer shapeType={ShapeType.RECTANGLE} />
            )}
        >
            <Icon
                {...dynamicIconProps}
                component={RectangleIcon}
            />
        </Popover>
    );
});

export default DrawRectangleControl;
