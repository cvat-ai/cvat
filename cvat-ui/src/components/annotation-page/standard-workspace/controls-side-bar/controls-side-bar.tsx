// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';

import {
    ActiveControl, ObjectType, Rotation, ShapeType,
} from 'reducers';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { LabelOptColor } from 'components/labels-editor/common';

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
import DrawMaskControl, { Props as DrawMaskControlProps } from './draw-mask-control';
import DrawSkeletonControl, { Props as DrawSkeletonControlProps } from './draw-skeleton-control';
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
    frameData: any;

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
const ObservedDrawMaskControl = ControlVisibilityObserver<DrawMaskControlProps>(DrawMaskControl);
const ObservedDrawSkeletonControl = ControlVisibilityObserver<DrawSkeletonControlProps>(DrawSkeletonControl);
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
        frameData,
    } = props;

    const controlsDisabled = !labels.length || frameData.deleted;
    const withUnspecifiedType = labels.some((label: any) => label.type === 'any' && !label.hasParent);
    let rectangleControlVisible = withUnspecifiedType;
    let polygonControlVisible = withUnspecifiedType;
    let polylineControlVisible = withUnspecifiedType;
    let pointsControlVisible = withUnspecifiedType;
    let ellipseControlVisible = withUnspecifiedType;
    let cuboidControlVisible = withUnspecifiedType;
    let maskControlVisible = withUnspecifiedType;
    let tagControlVisible = withUnspecifiedType;
    const skeletonControlVisible = labels.some((label: LabelOptColor) => label.type === 'skeleton');
    labels.forEach((label: LabelOptColor) => {
        rectangleControlVisible = rectangleControlVisible || label.type === ShapeType.RECTANGLE;
        polygonControlVisible = polygonControlVisible || label.type === ShapeType.POLYGON;
        polylineControlVisible = polylineControlVisible || label.type === ShapeType.POLYLINE;
        pointsControlVisible = pointsControlVisible || label.type === ShapeType.POINTS;
        ellipseControlVisible = ellipseControlVisible || label.type === ShapeType.ELLIPSE;
        cuboidControlVisible = cuboidControlVisible || label.type === ShapeType.CUBOID;
        maskControlVisible = maskControlVisible || label.type === ShapeType.MASK;
        tagControlVisible = tagControlVisible || label.type === ObjectType.TAG;
    });

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

    if (!controlsDisabled) {
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
                    ActiveControl.DRAW_ELLIPSE,
                    ActiveControl.DRAW_SKELETON,
                    ActiveControl.DRAW_MASK,
                    ActiveControl.AI_TOOLS,
                    ActiveControl.OPENCV_TOOLS,
                ].includes(activeControl);
                const editing = canvasInstance.mode() === CanvasMode.EDIT;

                if (!drawing) {
                    if (editing) {
                        // users probably will press N as they are used to do when they want to finish editing
                        // in this case, if a mask is being edited we probably want to finish editing first
                        canvasInstance.edit({ enabled: false });
                        return;
                    }

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
            {
                rectangleControlVisible && (
                    <ObservedDrawRectangleControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_RECTANGLE}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                polygonControlVisible && (
                    <ObservedDrawPolygonControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_POLYGON}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                polylineControlVisible && (
                    <ObservedDrawPolylineControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_POLYLINE}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                pointsControlVisible && (
                    <ObservedDrawPointsControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_POINTS}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                ellipseControlVisible && (
                    <ObservedDrawEllipseControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_ELLIPSE}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                cuboidControlVisible && (
                    <ObservedDrawCuboidControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_CUBOID}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                maskControlVisible && (
                    <ObservedDrawMaskControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_MASK}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                skeletonControlVisible && (
                    <ObservedDrawSkeletonControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_SKELETON}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                tagControlVisible && (
                    <ObservedSetupTagControl
                        canvasInstance={canvasInstance}
                        disabled={controlsDisabled}
                    />
                )
            }
            <hr />

            <ObservedMergeControl
                switchMergeShortcut={normalizedKeyMap.SWITCH_MERGE_MODE}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                mergeObjects={mergeObjects}
                disabled={controlsDisabled}
            />
            <ObservedGroupControl
                switchGroupShortcut={normalizedKeyMap.SWITCH_GROUP_MODE}
                resetGroupShortcut={normalizedKeyMap.RESET_GROUP}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                groupObjects={groupObjects}
                disabled={controlsDisabled}
            />
            <ObservedSplitControl
                canvasInstance={canvasInstance}
                switchSplitShortcut={normalizedKeyMap.SWITCH_SPLIT_MODE}
                activeControl={activeControl}
                splitTrack={splitTrack}
                disabled={controlsDisabled}
            />

            <ExtraControlsControl />
        </Layout.Sider>
    );
}
