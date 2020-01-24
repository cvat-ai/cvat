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

    mergeObjects(enabled: boolean): void;
}

const MergeControl = React.memo((props: Props): JSX.Element => {
    const {
        activeControl,
        canvasInstance,
        mergeObjects,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.MERGE
        ? {
            className: 'cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.merge({ enabled: false });
                mergeObjects(false);
            },
        } : {
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.merge({ enabled: true });
                mergeObjects(true);
            },
        };

    return (
        <Tooltip overlay='Merge shapes/tracks' placement='right'>
            <Icon {...dynamicIconProps} component={MergeIcon} />
        </Tooltip>
    );
});

export default MergeControl;
