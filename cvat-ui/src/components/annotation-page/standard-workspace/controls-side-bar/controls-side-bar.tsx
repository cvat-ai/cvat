// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';

import {
    Layout,
} from 'antd';

import {
    ActiveControl,
    Rotation,
} from 'reducers/interfaces';

import {
    Canvas,
} from 'cvat-canvas';

import RotateControl from './rotate-control';
import CursorControl from './cursor-control';
import MoveControl from './move-control';
import FitControl from './fit-control';
import ResizeControl from './resize-control';
import DrawRectangleControl from './draw-rectangle-control';
import DrawPolygonControl from './draw-polygon-control';
import DrawPolylineControl from './draw-polyline-control';
import DrawPointsControl from './draw-points-control';
import SetupTagControl from './setup-tag-control';
import MergeControl from './merge-control';
import GroupControl from './group-control';
import SplitControl from './split-control';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;

    mergeObjects(enabled: boolean): void;
    groupObjects(enabled: boolean): void;
    splitTrack(enabled: boolean): void;
    rotateFrame(rotation: Rotation): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    resetGroup(): void;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance,
        activeControl,

        mergeObjects,
        groupObjects,
        splitTrack,
        rotateFrame,
        repeatDrawShape,
        pasteShape,
        resetGroup,
    } = props;

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    const keyMap = {
        PASTE_SHAPE: {
            name: 'Paste shape',
            description: 'Paste a shape from internal CVAT clipboard',
            sequence: 'ctrl+v',
            action: 'keydown',
        },
        SWITCH_DRAW_MODE: {
            name: 'Draw mode',
            description: 'Repeat the latest procedure of drawing with the same parameters',
            sequence: 'n',
            action: 'keydown',
        },
        SWITCH_MERGE_MODE: {
            name: 'Merge mode',
            description: 'Activate or deactivate mode to merging shapes',
            sequence: 'm',
            action: 'keydown',
        },
        SWITCH_GROUP_MODE: {
            name: 'Group mode',
            description: 'Activate or deactivate mode to grouping shapes',
            sequence: 'g',
            action: 'keydown',
        },
        RESET_GROUP: {
            name: 'Reset group',
            description: 'Reset group for selected shapes (in group mode)',
            sequence: 'shift+g',
            action: 'keyup',
        },
        CANCEL: {
            name: 'Cancel',
            description: 'Cancel any active canvas mode',
            sequence: 'esc',
            action: 'keydown',
        },
        CLOCKWISE_ROTATION: {
            name: 'Rotate clockwise',
            description: 'Change image angle (add 90 degrees)',
            sequence: 'ctrl+r',
            action: 'keydown',
        },
        ANTICLOCKWISE_ROTATION: {
            name: 'Rotate anticlockwise',
            description: 'Change image angle (substract 90 degrees)',
            sequence: 'ctrl+shift+r',
            action: 'keydown',
        },
    };

    const handlers = {
        PASTE_SHAPE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            canvasInstance.cancel();
            pasteShape();
        },
        SWITCH_DRAW_MODE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            const drawing = [ActiveControl.DRAW_POINTS, ActiveControl.DRAW_POLYGON,
                ActiveControl.DRAW_POLYLINE, ActiveControl.DRAW_RECTANGLE].includes(activeControl);

            if (!drawing) {
                canvasInstance.cancel();
                // repeateDrawShapes gets all the latest parameters
                // and calls canvasInstance.draw() with them
                repeatDrawShape();
            } else {
                canvasInstance.draw({ enabled: false });
            }
        },
        SWITCH_MERGE_MODE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            const merging = activeControl === ActiveControl.MERGE;
            if (!merging) {
                canvasInstance.cancel();
            }
            canvasInstance.merge({ enabled: !merging });
            mergeObjects(!merging);
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
        CANCEL: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            if (activeControl !== ActiveControl.CURSOR) {
                canvasInstance.cancel();
            }
        },
        CLOCKWISE_ROTATION: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            rotateFrame(Rotation.CLOCKWISE90);
        },
        ANTICLOCKWISE_ROTATION: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            rotateFrame(Rotation.ANTICLOCKWISE90);
        },
    };

    return (
        <Layout.Sider
            className='cvat-canvas-controls-sidebar'
            theme='light'
            width={44}
        >
            <GlobalHotKeys keyMap={keyMap as any as KeyMap} handlers={handlers} allowChanges />

            <CursorControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <MoveControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <RotateControl rotateFrame={rotateFrame} />

            <hr />

            <FitControl canvasInstance={canvasInstance} />
            <ResizeControl canvasInstance={canvasInstance} activeControl={activeControl} />

            <hr />

            <DrawRectangleControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_RECTANGLE}
            />
            <DrawPolygonControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_POLYGON}
            />
            <DrawPolylineControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_POLYLINE}
            />
            <DrawPointsControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_POINTS}
            />

            <SetupTagControl
                canvasInstance={canvasInstance}
                isDrawing={false}
            />

            <hr />

            <MergeControl
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                mergeObjects={mergeObjects}
            />
            <GroupControl
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                groupObjects={groupObjects}
            />
            <SplitControl
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                splitTrack={splitTrack}
            />
        </Layout.Sider>
    );
}
