// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

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
} from 'reducers/interfaces';

interface Props {
    rotateFrame(rotation: Rotation): void;
}

function RotateControl(props: Props): JSX.Element {
    const {
        rotateFrame,
    } = props;

    return (
        <Popover
            overlayClassName='cvat-rotate-canvas-controls'
            placement='right'
            content={(
                <>
                    <Tooltip title='Rotate the image anticlockwise' placement='topRight'>
                        <Icon
                            className='cvat-rotate-canvas-controls-left'
                            onClick={(): void => rotateFrame(Rotation.ANTICLOCKWISE90)}
                            component={RotateIcon}
                        />
                    </Tooltip>
                    <Tooltip title='Rotate the image clockwise' placement='topRight'>
                        <Icon
                            className='cvat-rotate-canvas-controls-right'
                            onClick={(): void => rotateFrame(Rotation.CLOCKWISE90)}
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

export default React.memo(RotateControl);
