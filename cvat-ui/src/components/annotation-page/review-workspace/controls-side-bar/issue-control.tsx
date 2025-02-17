// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { ActiveControl, CombinedState } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';
import { RectangleIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    disabled: boolean;
    updateActiveControl(activeControl: ActiveControl): void;
}

const componentShortcuts = {
    OPEN_REVIEW_ISSUE: {
        name: 'Open an issue',
        description: 'Create a new issues in the review workspace',
        sequences: ['n'],
        scope: ShortcutScope.REVIEW_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function CreateIssueControl(props: Props): JSX.Element {
    const {
        activeControl, canvasInstance, updateActiveControl, disabled,
    } = props;

    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);

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

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
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
                    keyMap={subKeyMap(componentShortcuts, keyMap)}
                    handlers={handlers}
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
