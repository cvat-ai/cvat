// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Icon from '@ant-design/icons';

import { ActiveControl, CombinedState } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d, CanvasMode } from 'cvat-canvas3d-wrapper';
import { CubeIcon, IssueIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

interface Props {
    canvasInstance: Canvas | Canvas3d;
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
    const is3D = canvasInstance instanceof Canvas3d;
    const [regionSelected, setRegionSelected] = useState(is3D && canvasInstance.mode() === CanvasMode.DRAW);

    const handler = (region = false): void => {
        setRegionSelected(region);
        const drawingRegion = canvasInstance instanceof Canvas3d && canvasInstance.mode() === CanvasMode.DRAW;
        if (activeControl === ActiveControl.OPEN_ISSUE && drawingRegion === region) {
            canvasInstance.cancel();
            canvasInstance.selectRegion(false);
            updateActiveControl(ActiveControl.CURSOR);
        } else {
            canvasInstance.cancel();
            if (region && canvasInstance instanceof Canvas3d) {
                canvasInstance.draw({ enabled: true, issueRegion: true });
            } else {
                canvasInstance.selectRegion(true);
            }
            updateActiveControl(ActiveControl.OPEN_ISSUE);
        }
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        OPEN_REVIEW_ISSUE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            handler();
        },
    };

    const renderControl = (region: boolean): JSX.Element => {
        const active = activeControl === ActiveControl.OPEN_ISSUE && regionSelected === region;
        const label = region ? 'Create cuboid issue' : 'Create point issue';
        let stateClass = '';
        if (disabled) stateClass = 'cvat-disabled-canvas-control';
        else if (active) stateClass = 'cvat-active-canvas-control';
        let title = 'Open an issue';
        if (is3D) {
            title = region ? 'Create a cuboid issue: double-click in Perspective' :
                'Create a point issue: single-click a cloud point or cuboid surface';
        }
        return (
            <CVATTooltip title={title} placement='right'>
                <Icon
                    component={region ? CubeIcon : IssueIcon}
                    className={[
                        region ? 'cvat-issue-cuboid-control' : 'cvat-issue-control',
                        is3D && !region ? 'cvat-issue-point-control' : '',
                        stateClass,
                    ].filter(Boolean).join(' ')}
                    role='button'
                    aria-label={is3D ? label : 'Open an issue'}
                    aria-pressed={active}
                    aria-disabled={disabled}
                    tabIndex={disabled ? -1 : 0}
                    onClick={disabled ? undefined : () => handler(region)}
                    onKeyDown={(event) => {
                        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            handler(region);
                        }
                    }}
                />
            </CVATTooltip>
        );
    };

    return (
        <>
            {!disabled && (
                <GlobalHotKeys
                    keyMap={subKeyMap(componentShortcuts, keyMap)}
                    handlers={handlers}
                />
            )}
            {renderControl(false)}
            {is3D && renderControl(true)}
        </>
    );
}

Object.assign(CreateIssueControl, { displayName: 'CreateIssueControl' });
export default React.memo(CreateIssueControl);
