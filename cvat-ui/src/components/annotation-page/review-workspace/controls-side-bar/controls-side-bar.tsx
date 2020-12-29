// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { GlobalHotKeys, ExtendedKeyMapOptions } from 'react-hotkeys';
import Layout from 'antd/lib/layout';

import { ActiveControl, Rotation } from 'reducers/interfaces';
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
    keyMap: Record<string, ExtendedKeyMapOptions>;
    normalizedKeyMap: Record<string, string>;

    rotateFrame(rotation: Rotation): void;
    selectIssuePosition(enabled: boolean): void;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance, activeControl, normalizedKeyMap, keyMap, rotateFrame, selectIssuePosition,
    } = props;

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    const subKeyMap = {
        CANCEL: keyMap.CANCEL,
        OPEN_REVIEW_ISSUE: keyMap.OPEN_REVIEW_ISSUE,
    };

    const handlers = {
        CANCEL: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeControl !== ActiveControl.CURSOR) {
                canvasInstance.cancel();
            }
        },
        OPEN_REVIEW_ISSUE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeControl === ActiveControl.OPEN_ISSUE) {
                canvasInstance.selectRegion(false);
                selectIssuePosition(false);
            } else {
                canvasInstance.cancel();
                canvasInstance.selectRegion(true);
                selectIssuePosition(true);
            }
        },
    };

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} allowChanges />
            <CursorControl
                cursorShortkey={normalizedKeyMap.CANCEL}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
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
                selectIssuePosition={selectIssuePosition}
            />
        </Layout.Sider>
    );
}
