// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';

import { KeyMap } from 'utils/mousetrap-react';
import { ActiveControl, Rotation } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';

import RotateControl from 'components/annotation-page/standard-workspace/controls-side-bar/rotate-control';
import CursorControl from 'components/annotation-page/standard-workspace/controls-side-bar/cursor-control';
import MoveControl from 'components/annotation-page/standard-workspace/controls-side-bar/move-control';
import FitControl from 'components/annotation-page/standard-workspace/controls-side-bar/fit-control';
import ResizeControl from 'components/annotation-page/standard-workspace/controls-side-bar/resize-control';
import IssueControl from './issue-control';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    frameIsDeleted: boolean;
    rotateFrame(rotation: Rotation): void;
    updateActiveControl(activeControl: ActiveControl): void;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance, activeControl, normalizedKeyMap, keyMap, rotateFrame, updateActiveControl, frameIsDeleted,
    } = props;

    const controlsDisabled = frameIsDeleted;

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <CursorControl
                cursorShortkey={normalizedKeyMap.CANCEL}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                shortcuts={{
                    CANCEL: {
                        details: keyMap.CANCEL,
                        displayValue: normalizedKeyMap.CANCEL,
                    },
                }}
            />
            <MoveControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <RotateControl
                anticlockwiseShortcut={normalizedKeyMap.ANTICLOCKWISE_ROTATION}
                clockwiseShortcut={normalizedKeyMap.CLOCKWISE_ROTATION}
                rotateFrame={rotateFrame}
            />

            <hr />

            <FitControl canvasInstance={canvasInstance} />
            <ResizeControl canvasInstance={canvasInstance} activeControl={activeControl} />

            <hr />
            <IssueControl
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                updateActiveControl={updateActiveControl}
                disabled={controlsDisabled}
                shortcuts={{
                    OPEN_REVIEW_ISSUE: {
                        details: keyMap.OPEN_REVIEW_ISSUE,
                        displayValue: normalizedKeyMap.OPEN_REVIEW_ISSUE,
                    },
                }}
            />
        </Layout.Sider>
    );
}
