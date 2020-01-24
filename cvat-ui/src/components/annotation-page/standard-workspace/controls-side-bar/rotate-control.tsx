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

const RotateControl = React.memo((props: Props): JSX.Element => {
    const {
        rotateAll,
        canvasInstance,
    } = props;

    return (
        <Popover
            overlayClassName='cvat-rotate-canvas-controls'
            placement='right'
            content={(
                <>
                    <Tooltip overlay='Rotate the image anticlockwise' placement='topRight'>
                        <Icon
                            className='cvat-rotate-canvas-controls-left'
                            onClick={(): void => canvasInstance
                                .rotate(Rotation.ANTICLOCKWISE90, rotateAll)}
                            component={RotateIcon}
                        />
                    </Tooltip>
                    <Tooltip overlay='Rotate the image clockwise' placement='topRight'>
                        <Icon
                            className='cvat-rotate-canvas-controls-right'
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
});

export default RotateControl;
