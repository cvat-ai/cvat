import React from 'react';

import {
    Tooltip,
    Icon,
} from 'antd';

import {
    MergeIcon,
} from 'icons';

import { Canvas } from 'cvat-canvas';
import { ActiveControl } from 'reducers/interfaces';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;

    onMergeStart(): void;
}

export default function MergeControl(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        onMergeStart,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.MERGE
        ? {
            className: 'cvat-annotation-page-active-control',
            onClick: (): void => {
                canvasInstance.merge({ enabled: false });
            },
        } : {
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.merge({ enabled: true });
                onMergeStart();
            },
        };

    return (
        <Tooltip overlay='Merge shapes/tracks' placement='right'>
            <Icon {...dynamicIconProps} component={MergeIcon} />
        </Tooltip>
    );
}
