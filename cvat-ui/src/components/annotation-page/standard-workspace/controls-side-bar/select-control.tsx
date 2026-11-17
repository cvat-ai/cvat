// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';
import { SelectIcon } from 'icons';

import CVATTooltip from 'components/common/cvat-tooltip';

export interface Props {
    selecting: boolean;
    disabled: boolean;
    shortcut: string;
    onClick(): void;
}

function SelectControl(props: Props): JSX.Element {
    const {
        selecting, disabled, shortcut, onClick,
    } = props;

    return disabled ? (
        <Icon component={SelectIcon} className='cvat-select-control cvat-disabled-canvas-control' />
    ) : (
        <CVATTooltip title={`Select objects ${shortcut}`} placement='right'>
            <Icon
                component={SelectIcon}
                className={selecting ?
                    'cvat-select-control cvat-active-canvas-control' :
                    'cvat-select-control'}
                onClick={onClick}
            />
        </CVATTooltip>
    );
}

Object.assign(SelectControl, { displayName: 'SelectControl' });
export default React.memo(SelectControl);
