// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { ActiveControl } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';
import { RectangleIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    disabled: boolean;
    updateActiveControl(activeControl: ActiveControl): void;
}

function CreateIssueControl(props: Props): JSX.Element {
    const {
        activeControl, canvasInstance, updateActiveControl, disabled,
    } = props;

    return (
        disabled ? (
            <Icon component={RectangleIcon} className='cvat-issue-control cvat-disabled-canvas-control' />
        ) : (
            <CVATTooltip title='Open an issue' placement='right'>
                <Icon
                    component={RectangleIcon}
                    className={
                        activeControl === ActiveControl.OPEN_ISSUE ?
                            'cvat-issue-control cvat-active-canvas-control' :
                            'cvat-issue-control'
                    }
                    onClick={(): void => {
                        if (activeControl === ActiveControl.OPEN_ISSUE) {
                            canvasInstance.selectRegion(false);
                            updateActiveControl(ActiveControl.CURSOR);
                        } else {
                            canvasInstance.cancel();
                            canvasInstance.selectRegion(true);
                            updateActiveControl(ActiveControl.OPEN_ISSUE);
                        }
                    }}
                />
            </CVATTooltip>
        )
    );
}

export default React.memo(CreateIssueControl);
