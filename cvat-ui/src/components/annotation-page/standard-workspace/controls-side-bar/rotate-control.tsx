import React from 'react';

import {
    Icon,
    Tooltip,
    Popover,
} from 'antd';

import {
    RotateIcon,
} from 'icons';

import {
    Rotation,
    Canvas,
} from 'cvat-canvas';

interface Props {
    canvasInstance: Canvas;
    rotateAll: boolean;
}

export default function RotateControl(props: Props): JSX.Element {
    const {
        rotateAll,
        canvasInstance,
    } = props;

    return (
        <Popover
            overlayClassName='cvat-annotation-page-controls-rotate'
            placement='right'
            content={(
                <>
                    <Tooltip overlay='Rotate the image anticlockwise' placement='topRight'>
                        <Icon
                            className='cvat-annotation-page-controls-rotate-left'
                            onClick={(): void => canvasInstance
                                .rotate(Rotation.ANTICLOCKWISE90, rotateAll)}
                            component={RotateIcon}
                        />
                    </Tooltip>
                    <Tooltip overlay='Rotate the image clockwise' placement='topRight'>
                        <Icon
                            className='cvat-annotation-page-controls-rotate-right'
                            onClick={(): void => canvasInstance
                                .rotate(Rotation.CLOCKWISE90, rotateAll)}
                            component={RotateIcon}
                        />
                    </Tooltip>
                </>
            )}
            trigger='hover'
        >
            <Icon component={RotateIcon} />
        </Popover>
    );
}
