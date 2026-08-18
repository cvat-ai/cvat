// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { SelectOutlined } from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ActiveControl } from 'reducers';

export interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    hasSelectedObjects: boolean;
    disabled: boolean;
    updateActiveControl(activeControl: ActiveControl): void;
}

function SelectControl(props: Props): JSX.Element {
    const {
        canvasInstance, activeControl, hasSelectedObjects, disabled, updateActiveControl,
    } = props;
    const selecting = activeControl === ActiveControl.SELECT;
    const highlighted = selecting || hasSelectedObjects;

    const onClick = (): void => {
        if (selecting) {
            canvasInstance.selectObjects({ enabled: false });
            updateActiveControl(ActiveControl.CURSOR);
        } else {
            canvasInstance.cancel();
            canvasInstance.selectObjects({ enabled: true });
            updateActiveControl(ActiveControl.SELECT);
        }
    };

    return disabled ? (
        <SelectOutlined className='cvat-select-control cvat-disabled-canvas-control' />
    ) : (
        <CVATTooltip title='Select objects' placement='right'>
            <SelectOutlined
                className={highlighted ?
                    'cvat-select-control cvat-active-canvas-control' :
                    'cvat-select-control'}
                onClick={onClick}
            />
        </CVATTooltip>
    );
}

Object.assign(SelectControl, { displayName: 'SelectControl' });
export default React.memo(SelectControl);
