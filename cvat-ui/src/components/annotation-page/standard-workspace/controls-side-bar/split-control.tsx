import React from 'react';

import {
    Tooltip,
    Icon,
} from 'antd';

import {
    SplitIcon,
} from 'icons';

import { Canvas } from 'cvat-canvas';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;

    onSplitStart(): void;
}

export default function SplitControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        onSplitStart,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.SPLIT
        ? {
            className: 'cvat-annotation-page-active-control',
            onClick: (): void => {
                canvasInstance.split({ enabled: false });
            },
        } : {
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.split({ enabled: true });
                onSplitStart();
            },
        };

    return (
        <Tooltip overlay='Split a track' placement='right'>
            <Icon {...dynamicIconProps} component={SplitIcon} />
        </Tooltip>
    );
}
