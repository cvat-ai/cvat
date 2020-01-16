import React from 'react';
import {
    Popover,
    Icon,
} from 'antd';

import { Canvas } from 'cvat-canvas';
import { RectangleIcon } from 'icons';
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

    if (activeControl === ActiveControl.DRAW_RECTANGLE) {
        return (
            <Icon
                className='cvat-annotation-page-active-control'
                onClick={(): void => {
                    canvasInstance.draw({ enabled: false });
                }}
                component={RectangleIcon}
            />
        );
    }

    return (
        <Popover
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={(
                <DrawShapePopoverContainer shapeType={ShapeType.RECTANGLE} />
            )}
        >
            <Icon
                component={RectangleIcon}
            />
        </Popover>
    );
}
