import React from 'react';
import Icon from '@ant-design/icons';
import { AudioLoopIcon } from 'icons';

import CVATTooltip from 'components/common/cvat-tooltip';

export interface Props {
    loop: boolean;
    onLoopChange(loop: boolean): void;
}

function LoopControl(props: Props): JSX.Element {
    const { loop, onLoopChange } = props;

    const handler = (): void => {
        onLoopChange(!loop);
    };

    return (
        <CVATTooltip title={`Loop region playback${loop ? ' (on)' : ''}`} placement='right'>
            <Icon
                component={AudioLoopIcon}
                className={
                    loop ?
                        'cvat-active-canvas-control cvat-audio-loop-control' :
                        'cvat-audio-loop-control'
                }
                onClick={handler}
            />
        </CVATTooltip>
    );
}

export default React.memo(LoopControl);
