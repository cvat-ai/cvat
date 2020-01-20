import React from 'react';

import {
    Tooltip,
    Icon,
} from 'antd';

import {
    GroupIcon,
} from 'icons';

import { Canvas } from 'cvat-canvas';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;

    onGroupStart(): void;
}

function GroupControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        onGroupStart,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.GROUP
        ? {
            className: 'cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.group({ enabled: false });
            },
        } : {
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.group({ enabled: true });
                onGroupStart();
            },
        };

    return (
        <Tooltip overlay='Group shapes/tracks' placement='right'>
            <Icon {...dynamicIconProps} component={GroupIcon} />
        </Tooltip>
    );
}

export default React.memo(GroupControl);
