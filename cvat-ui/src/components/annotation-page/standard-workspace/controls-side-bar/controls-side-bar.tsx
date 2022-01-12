// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';

import { ActiveControl, Rotation } from 'reducers/interfaces';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { Canvas } from 'cvat-canvas-wrapper';

import ControlVisibilityObserver, { ExtraControlsControl } from './control-visibility-observer';
import RotateControl, { Props as RotateControlProps } from './rotate-control';
import CursorControl, { Props as CursorControlProps } from './cursor-control';
import MoveControl, { Props as MoveControlProps } from './move-control';
import FitControl, { Props as FitControlProps } from './fit-control';
import ResizeControl, { Props as ResizeControlProps } from './resize-control';
import ToolsControl from './tools-control';
import OpenCVControl from './opencv-control';
import DrawRectangleControl, { Props as DrawRectangleControlProps } from './draw-rectangle-control';
import DrawPolygonControl, { Props as DrawPolygonControlProps } from './draw-polygon-control';
import DrawPolylineControl, { Props as DrawPolylineControlProps } from './draw-polyline-control';
import DrawPointsControl, { Props as DrawPointsControlProps } from './draw-points-control';
import DrawEllipseControl, { Props as DrawEllipseControlProps } from './draw-ellipse-control';
import DrawCuboidControl, { Props as DrawCuboidControlProps } from './draw-cuboid-control';
import SetupTagControl, { Props as SetupTagControlProps } from './setup-tag-control';
import MergeControl, { Props as MergeControlProps } from './merge-control';
import GroupControl, { Props as GroupControlProps } from './group-control';
import SplitControl, { Props as SplitControlProps } from './split-control';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    labels: any[];

    mergeObjects(enabled: boolean): void;
    groupObjects(enabled: boolean): void;
    splitTrack(enabled: boolean): void;
    rotateFrame(rotation: Rotation): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    resetGroup(): void;
    redrawShape(): void;
}

// We use the observer to see if these controls are in the viewport
// They automatically put to extra if not
const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(CursorControl);
const ObservedMoveControl = ControlVisibilityObserver<MoveControlProps>(MoveControl);
const ObservedRotateControl = ControlVisibilityObserver<RotateControlProps>(RotateControl);
const ObservedFitControl = ControlVisibilityObserver<FitControlProps>(FitControl);
const ObservedResizeControl = ControlVisibilityObserver<ResizeControlProps>(ResizeControl);
const ObservedToolsControl = ControlVisibilityObserver(ToolsControl);
const ObservedOpenCVControl = ControlVisibilityObserver(OpenCVControl);
const ObservedDrawRectangleControl = ControlVisibilityObserver<DrawRectangleControlProps>(DrawRectangleControl);
const ObservedDrawPolygonControl = ControlVisibilityObserver<DrawPolygonControlProps>(DrawPolygonControl);
const ObservedDrawPolylineControl = ControlVisibilityObserver<DrawPolylineControlProps>(DrawPolylineControl);
const ObservedDrawPointsControl = ControlVisibilityObserver<DrawPointsControlProps>(DrawPointsControl);
const ObservedDrawEllipseControl = ControlVisibilityObserver<DrawEllipseControlProps>(DrawEllipseControl);
const ObservedDrawCuboidControl = ControlVisibilityObserver<DrawCuboidControlProps>(DrawCuboidControl);
const ObservedSetupTagControl = ControlVisibilityObserver<SetupTagControlProps>(SetupTagControl);
const ObservedMergeControl = ControlVisibilityObserver<MergeControlProps>(MergeControl);
const ObservedGroupControl = ControlVisibilityObserver<GroupControlProps>(GroupControl);
const ObservedSplitControl = ControlVisibilityObserver<SplitControlProps>(SplitControl);

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        normalizedKeyMap,
        keyMap,
        labels,
        mergeObjects,
        groupObjects,
        splitTrack,
        rotateFrame,
        repeatDrawShape,
        pasteShape,
        resetGroup,
        redrawShape,
    } = props;

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    let subKeyMap: any = {
        CANCEL: keyMap.CANCEL,
        CLOCKWISE_ROTATION: keyMap.CLOCKWISE_ROTATION,
        ANTICLOCKWISE_ROTATION: keyMap.ANTICLOCKWISE_ROTATION,
    };

    let handlers: any = {
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
                const drawing = [
                    ActiveControl.DRAW_POINTS,
                    ActiveControl.DRAW_POLYGON,
                    ActiveControl.DRAW_POLYLINE,
                    ActiveControl.DRAW_RECTANGLE,
                    ActiveControl.DRAW_CUBOID,
                    ActiveControl.AI_TOOLS,
                    ActiveControl.OPENCV_TOOLS,
                ].includes(activeControl);

                if (!drawing) {
                    canvasInstance.cancel();
                    // repeateDrawShapes gets all the latest parameters
                    // and calls canvasInstance.draw() with them

                    if (event && event.shiftKey) {
                        redrawShape();
                    } else {
                        repeatDrawShape();
                    }
                } else {
                    if ([ActiveControl.AI_TOOLS, ActiveControl.OPENCV_TOOLS].includes(activeControl)) {
                        // separated API method
                        canvasInstance.interact({ enabled: false });
                        return;
                    }

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
            SWITCH_SPLIT_MODE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const splitting = activeControl === ActiveControl.SPLIT;
                if (!splitting) {
                    canvasInstance.cancel();
                }
                canvasInstance.split({ enabled: !splitting });
                splitTrack(!splitting);
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
            SWITCH_MERGE_MODE: keyMap.SWITCH_MERGE_MODE,
            SWITCH_SPLIT_MODE: keyMap.SWITCH_SPLIT_MODE,
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
            <ObservedRotateControl
                anticlockwiseShortcut={normalizedKeyMap.ANTICLOCKWISE_ROTATION}
                clockwiseShortcut={normalizedKeyMap.CLOCKWISE_ROTATION}
                rotateFrame={rotateFrame}
            />

            <hr />

            <ObservedFitControl canvasInstance={canvasInstance} />
            <ObservedResizeControl canvasInstance={canvasInstance} activeControl={activeControl} />

            <hr />
            <ObservedToolsControl />
            <ObservedOpenCVControl />
            <ObservedDrawRectangleControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_RECTANGLE}
                disabled={!labels.length}
            />
            <ObservedDrawPolygonControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_POLYGON}
                disabled={!labels.length}
            />
            <ObservedDrawPolylineControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_POLYLINE}
                disabled={!labels.length}
            />
            <ObservedDrawPointsControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_POINTS}
                disabled={!labels.length}
            />
            <ObservedDrawEllipseControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_ELLIPSE}
                disabled={!labels.length}
            />
            <ObservedDrawCuboidControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_CUBOID}
                disabled={!labels.length}
            />
            <ObservedSetupTagControl canvasInstance={canvasInstance} isDrawing={false} disabled={!labels.length} />

            <hr />

            <ObservedMergeControl
                switchMergeShortcut={normalizedKeyMap.SWITCH_MERGE_MODE}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                mergeObjects={mergeObjects}
                disabled={!labels.length}
            />
            <ObservedGroupControl
                switchGroupShortcut={normalizedKeyMap.SWITCH_GROUP_MODE}
                resetGroupShortcut={normalizedKeyMap.RESET_GROUP}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                groupObjects={groupObjects}
                disabled={!labels.length}
            />
            <ObservedSplitControl
                canvasInstance={canvasInstance}
                switchSplitShortcut={normalizedKeyMap.SWITCH_SPLIT_MODE}
                activeControl={activeControl}
                splitTrack={splitTrack}
                disabled={!labels.length}
            />

            <ExtraControlsControl />
        </Layout.Sider>
    );
}
