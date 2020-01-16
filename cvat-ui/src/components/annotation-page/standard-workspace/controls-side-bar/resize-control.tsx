import React from 'react';

import {
    Icon,
    Tooltip,
} from 'antd';

import {
    ZoomIcon,
} from 'icons';

import {
    ActiveControl,
} from 'reducers/interfaces';

import {
    Canvas,
} from 'cvat-canvas';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
}

export default function ResizeControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
    } = props;

    return (
        <Tooltip overlay='Select a region of interest' placement='right'>
            <Icon
                component={ZoomIcon}
                className={activeControl === ActiveControl.ZOOM_CANVAS
                    ? 'cvat-annotation-page-active-control' : ''
                }
                onClick={(): void => {
                    if (activeControl === ActiveControl.ZOOM_CANVAS) {
                        canvasInstance.zoomCanvas(false);
                    } else {
                        canvasInstance.cancel();
                        canvasInstance.zoomCanvas(true);
                    }
                }}
            />
        </Tooltip>
    );
}
