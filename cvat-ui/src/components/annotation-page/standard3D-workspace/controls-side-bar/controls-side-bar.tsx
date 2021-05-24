// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';
import { ActiveControl } from 'reducers/interfaces';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';
import MoveControl, {
    Props as MoveControlProps,
} from 'components/annotation-page/standard-workspace/controls-side-bar/move-control';
import CursorControl, {
    Props as CursorControlProps,
} from 'components/annotation-page/standard-workspace/controls-side-bar/cursor-control';
import DrawCuboidControl, {
    Props as DrawCuboidControlProps,
} from 'components/annotation-page/standard-workspace/controls-side-bar/draw-cuboid-control';
import GroupControl, {
    Props as GroupControlProps,
} from 'components/annotation-page/standard-workspace/controls-side-bar/group-control';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import ControlVisibilityObserver from 'components/annotation-page/standard-workspace/controls-side-bar/control-visibility-observer';

interface Props {
    keyMap: KeyMap;
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    normalizedKeyMap: Record<string, string>;
    labels: any[];
    jobInstance: any;
    repeatDrawShape(): void;
    redrawShape(): void;
    pasteShape(): void;
    groupObjects(enabled: boolean): void;
    resetGroup(): void;
}

const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(CursorControl);
const ObservedMoveControl = ControlVisibilityObserver<MoveControlProps>(MoveControl);
const ObservedDrawCuboidControl = ControlVisibilityObserver<DrawCuboidControlProps>(DrawCuboidControl);
const ObservedGroupControl = ControlVisibilityObserver<GroupControlProps>(GroupControl);

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance,
        pasteShape,
        activeControl,
        normalizedKeyMap,
        keyMap,
        labels,
        redrawShape,
        repeatDrawShape,
        groupObjects,
        resetGroup,
        jobInstance,
    } = props;

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    let subKeyMap: any = {
        CANCEL: keyMap.CANCEL,
    };

    let handlers: any = {
        CANCEL: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeControl !== ActiveControl.CURSOR) {
                canvasInstance.cancel();
            }
        },
    };

    if (labels.length) {
        handlers = {
            ...handlers,
            PASTE_SHAPE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                canvasInstance.cancel();
                pasteShape();
            },
            SWITCH_DRAW_MODE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const drawing = [ActiveControl.DRAW_CUBOID].includes(activeControl);

                if (!drawing) {
                    canvasInstance.cancel();
                    if (event && event.shiftKey) {
                        redrawShape();
                    } else {
                        repeatDrawShape();
                    }
                } else {
                    canvasInstance.draw({ enabled: false });
                }
            },
            SWITCH_GROUP_MODE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const grouping = activeControl === ActiveControl.GROUP;
                if (!grouping) {
                    canvasInstance.cancel();
                }
                canvasInstance.group({ enabled: !grouping });
                groupObjects(!grouping);
            },
            RESET_GROUP: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const grouping = activeControl === ActiveControl.GROUP;
                if (!grouping) {
                    return;
                }
                resetGroup();
                canvasInstance.group({ enabled: false });
                groupObjects(false);
            },
        };
        subKeyMap = {
            ...subKeyMap,
            PASTE_SHAPE: keyMap.PASTE_SHAPE,
            SWITCH_DRAW_MODE: keyMap.SWITCH_DRAW_MODE,
            SWITCH_GROUP_MODE: keyMap.SWITCH_GROUP_MODE,
            RESET_GROUP: keyMap.RESET_GROUP,
        };
    }

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
            <ObservedCursorControl
                cursorShortkey={normalizedKeyMap.CANCEL}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
            />
            <ObservedMoveControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <ObservedDrawCuboidControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_CUBOID}
                disabled={!labels.length}
            />
            <ObservedGroupControl
                switchGroupShortcut={normalizedKeyMap.SWITCH_GROUP_MODE}
                resetGroupShortcut={normalizedKeyMap.RESET_GROUP}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                groupObjects={groupObjects}
                disabled={!labels.length}
                jobInstance={jobInstance}
            />
        </Layout.Sider>
    );
}
