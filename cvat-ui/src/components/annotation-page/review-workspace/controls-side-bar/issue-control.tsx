// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { ActiveControl } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';
import { RectangleIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    disabled: boolean;
    shortcuts: {
        OPEN_REVIEW_ISSUE: {
            details: KeyMapItem;
            displayValue: string;
        };
    }
    updateActiveControl(activeControl: ActiveControl): void;
}

function CreateIssueControl(props: Props): JSX.Element {
    const {
        activeControl, canvasInstance, updateActiveControl, disabled, shortcuts,
    } = props;

    const handler = (): void => {
        if (activeControl === ActiveControl.OPEN_ISSUE) {
            canvasInstance.selectRegion(false);
            updateActiveControl(ActiveControl.CURSOR);
        } else {
            canvasInstance.cancel();
            canvasInstance.selectRegion(true);
            updateActiveControl(ActiveControl.OPEN_ISSUE);
        }
    };

    const shortcutHandlers = {
        OPEN_REVIEW_ISSUE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            handler();
        },
    };

    return (
        disabled ? (
            <Icon component={RectangleIcon} className='cvat-issue-control cvat-disabled-canvas-control' />
        ) : (
            <>
                <GlobalHotKeys
                    keyMap={{ OPEN_REVIEW_ISSUE: shortcuts.OPEN_REVIEW_ISSUE.details }}
                    handlers={shortcutHandlers}
                />
                <CVATTooltip title='Open an issue' placement='right'>
                    <Icon
                        component={RectangleIcon}
                        className={
                            activeControl === ActiveControl.OPEN_ISSUE ?
                                'cvat-issue-control cvat-active-canvas-control' :
                                'cvat-issue-control'
                        }
                        onClick={handler}
                    />
                </CVATTooltip>
            </>
        )
    );
}

export default React.memo(CreateIssueControl);
