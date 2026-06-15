// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';
import notification from 'antd/lib/notification';
import { useSelector } from 'react-redux';

import {
    ActiveControl, Rotation, CombinedState,
} from 'reducers';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { LabelType, ObjectType } from 'cvat-core-wrapper';

import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import ControlVisibilityObserver, {
    ExtraControlsControl, ContainerHeightContext,
} from './control-visibility-observer';
import RotateControl, { Props as RotateControlProps } from './rotate-control';
import CursorControl, { Props as CursorControlProps } from './cursor-control';
import MoveControl, { Props as MoveControlProps } from './move-control';
import FitControl, { Props as FitControlProps } from './fit-control';
import ResizeControl, { Props as ResizeControlProps } from './resize-control';
import ToolsControl from './tools-control';
import OpenCVControl from './opencv-control';
import RabbitControl from './rabbit-control';
import NCPSetupTagControl from './ncp-setup-tag-control';
import SnapToolsControl from './snap-tools-control';
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
import JoinControl, { Props as JoinControlProps } from './join-control';
import SplitControl, { Props as SplitControlProps } from './split-control';
import SliceControl, { Props as SliceControlProps } from './slice-control';

type Label = CombinedState['annotation']['job']['labels'][0];

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    labels: Label[];
    frameData: any;

    updateActiveControl(activeControl: ActiveControl): void;
    rotateFrame(rotation: Rotation): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    resetGroup(): void;
    redrawShape(): void;
}

const componentShortcuts = {
    CLOCKWISE_ROTATION_STANDARD_CONTROLS: {
        name: 'Rotate clockwise',
        description: 'Change image angle (add 90 degrees)',
        sequences: ['ctrl+r'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    ANTICLOCKWISE_ROTATION_STANDARD_CONTROLS: {
        name: 'Rotate anticlockwise',
        description: 'Change image angle (subtract 90 degrees)',
        sequences: ['ctrl+shift+r'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    PASTE_SHAPE: {
        name: 'Paste shape',
        description: 'Paste a shape from internal CVAT clipboard',
        sequences: ['ctrl+v'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_DRAW_MODE_STANDARD_CONTROLS: {
        name: 'Draw mode',
        description:
            'Repeat the latest procedure of drawing with the same parameters',
        sequences: ['n'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_REDRAW_MODE_STANDARD_CONTROLS: {
        name: 'Redraw shape',
        description: 'Remove selected shape and redraw it from scratch',
        sequences: ['shift+n'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_GROUP_MODE_STANDARD_CONTROLS: {
        name: 'Group mode',
        description: 'Activate or deactivate mode to grouping shapes',
        sequences: ['g'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    RESET_GROUP_STANDARD_CONTROLS: {
        name: 'Reset group',
        description: 'Reset group for selected shapes (in group mode)',
        sequences: ['shift+g'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_MERGE_MODE_STANDARD_CONTROLS: {
        name: 'Merge mode',
        description: 'Activate or deactivate mode to merging shapes',
        sequences: ['m'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_SPLIT_MODE_STANDARD_CONTROLS: {
        name: 'Split mode',
        description: 'Activate or deactivate mode to splitting shapes',
        sequences: ['alt+m'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

// We use the observer to see if these controls are in the scopeport
// They automatically put to extra if not
const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(CursorControl, 'CursorControl');
const ObservedMoveControl = ControlVisibilityObserver<MoveControlProps>(MoveControl, 'MoveControl');
const ObservedRotateControl = ControlVisibilityObserver<RotateControlProps>(RotateControl, 'RotateControl');
const ObservedFitControl = ControlVisibilityObserver<FitControlProps>(FitControl, 'FitControl');
const ObservedResizeControl = ControlVisibilityObserver<ResizeControlProps>(ResizeControl, 'ResizeControl');
const ObservedToolsControl = ControlVisibilityObserver(ToolsControl, 'ToolsControl');
const ObservedOpenCVControl = ControlVisibilityObserver(OpenCVControl, 'OpenCVControl');
const ObservedRabbitControl = ControlVisibilityObserver(RabbitControl, 'RabbitControl');
const NCPObservedSetupTagControl = ControlVisibilityObserver(NCPSetupTagControl, 'NCPSetupTagControl');
const ObservedDrawRectangleControl = ControlVisibilityObserver<DrawRectangleControlProps>(DrawRectangleControl, 'DrawRectangleControl');
const ObservedDrawPolygonControl = ControlVisibilityObserver<DrawPolygonControlProps>(DrawPolygonControl, 'DrawPolygonControl');
const ObservedDrawPolylineControl = ControlVisibilityObserver<DrawPolylineControlProps>(DrawPolylineControl, 'DrawPolylineControl');
const ObservedDrawPointsControl = ControlVisibilityObserver<DrawPointsControlProps>(DrawPointsControl, 'DrawPointsControl');
const ObservedDrawEllipseControl = ControlVisibilityObserver<DrawEllipseControlProps>(DrawEllipseControl, 'DrawEllipseControl');
const ObservedDrawCuboidControl = ControlVisibilityObserver<DrawCuboidControlProps>(DrawCuboidControl, 'DrawCuboidControl');
const ObservedDrawMaskControl = ControlVisibilityObserver<DrawMaskControlProps>(DrawMaskControl, 'DrawMaskControl');
const ObservedDrawSkeletonControl = ControlVisibilityObserver<DrawSkeletonControlProps>(DrawSkeletonControl, 'DrawSkeletonControl');
const ObservedSetupTagControl = ControlVisibilityObserver<SetupTagControlProps>(SetupTagControl, 'SetupTagControl');
const ObservedMergeControl = ControlVisibilityObserver<MergeControlProps>(MergeControl, 'MergeControl');
const ObservedGroupControl = ControlVisibilityObserver<GroupControlProps>(GroupControl, 'GroupControl');
const ObservedJoinControl = ControlVisibilityObserver<JoinControlProps>(JoinControl, 'JoinControl');
const ObservedSplitControl = ControlVisibilityObserver<SplitControlProps>(SplitControl, 'SplitControl');
const ObservedSliceControl = ControlVisibilityObserver<SliceControlProps>(SliceControl, 'SliceControl');

export default function NCPControlsSideBarComponent(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        normalizedKeyMap,
        keyMap,
        labels,
        updateActiveControl,
        rotateFrame,
        repeatDrawShape,
        pasteShape,
        resetGroup,
        redrawShape,
        frameData,
    } = props;

    const controlsDisabled = !labels.length || frameData.deleted;
    const withUnspecifiedType = labels.some((label: any) => label.type === 'any' && !label.hasParent);
    let tagControlVisible = withUnspecifiedType;


    // ── First-frame tag check ────────────────────────────────────────────────
    const currentFrame = useSelector(
        (state: CombinedState) => state.annotation.player.frame.number,
    );
    const frameNumbers = useSelector(
        (state: CombinedState) => state.annotation.job.frameNumbers,
    );
    const annotationStates = useSelector(
        (state: CombinedState) => state.annotation.annotations.states,
    );
    const annotationsInitialized = useSelector(
        (state: CombinedState) => state.annotation.annotations.initialized,
    );

    const FIRST_FRAME_TAG_KEY = 'ncp-no-tag-first-frame';

    React.useEffect(() => {
        if (!annotationsInitialized || !frameNumbers?.length) return;

        const firstFrame = frameNumbers[0];

        if (currentFrame === firstFrame) {
            const hasTag = annotationStates.some(
                (s: any) => s.objectType === ObjectType.TAG,
            );
            if (!hasTag) {
                notification.warning({
                    message: 'Missing road matter tag on first frame',
                    description:
                        'This is the first frame of the job and no tag has been set. ' +
                        'Please add a tag annotation before continuing.',
                    duration: 0, // stays open until dismissed
                    key: FIRST_FRAME_TAG_KEY,
                });
            } else {
                notification.destroy(FIRST_FRAME_TAG_KEY);
            }
        } else {
            notification.destroy(FIRST_FRAME_TAG_KEY);
        }
    }, [currentFrame, frameNumbers, annotationStates, annotationsInitialized]);

    // Close notification when the sidebar unmounts
    React.useEffect(() => () => notification.destroy(FIRST_FRAME_TAG_KEY), []);

    // ── Container height tracking ────────────────────────────────────────────
    const containerRef = React.useRef<HTMLDivElement>(null);
    const containerHeightRef = React.useRef<number>(Number.MAX_SAFE_INTEGER);
    const [containerHeight, setContainerHeight] = React.useState(Number.MAX_SAFE_INTEGER);

    React.useEffect(() => {
        const update = (): void => {
            if (containerRef.current) {
                if (containerHeightRef.current !== containerRef.current.offsetHeight) {
                    containerHeightRef.current = containerRef.current.offsetHeight;
                    setContainerHeight(containerRef.current.offsetHeight);
                }
            }
        };

        update();
        if (containerRef.current) {
            const observer = new ResizeObserver(update);
            observer.observe(containerRef.current);
            return () => {
                observer.disconnect();
            };
        }

        return () => {};
    }, []);

    const dynamicMergeIconProps =
        activeControl === ActiveControl.MERGE ?
            {
                className: 'cvat-merge-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.merge({ enabled: false });
                    updateActiveControl(ActiveControl.CURSOR);
                },
            } :
            {
                className: 'cvat-merge-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.merge({ enabled: true });
                    updateActiveControl(ActiveControl.MERGE);
                },
            };

    const dynamicGroupIconProps =
        activeControl === ActiveControl.GROUP ?
            {
                className: 'cvat-group-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.group({ enabled: false });
                    updateActiveControl(ActiveControl.CURSOR);
                },
            } :
            {
                className: 'cvat-group-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.group({ enabled: true });
                    updateActiveControl(ActiveControl.GROUP);
                },
            };

    const dynamicTrackIconProps = activeControl === ActiveControl.SPLIT ?
        {
            className: 'cvat-split-track-control cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.split({ enabled: false });
            },
        } :
        {
            className: 'cvat-split-track-control',
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.split({ enabled: true });
                updateActiveControl(ActiveControl.SPLIT);
            },
        };

    let handlers: Partial<Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void>> = {
        CLOCKWISE_ROTATION_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            rotateFrame(Rotation.CLOCKWISE90);
        },
        ANTICLOCKWISE_ROTATION_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            rotateFrame(Rotation.ANTICLOCKWISE90);
        },
        SWITCH_GROUP_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined): void => {
            event?.preventDefault();
            dynamicGroupIconProps.onClick();
        },
        RESET_GROUP_STANDARD_CONTROLS: (event: KeyboardEvent | undefined): void => {
            event?.preventDefault();
            const grouping = activeControl === ActiveControl.GROUP;
            if (!grouping) {
                return;
            }
            resetGroup();
            canvasInstance.group({ enabled: false });
            updateActiveControl(ActiveControl.CURSOR);
        },
        SWITCH_MERGE_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined): void => {
            event?.preventDefault();
            dynamicMergeIconProps.onClick();
        },
        SWITCH_SPLIT_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            dynamicTrackIconProps.onClick();
        },
    };

    const handleDrawMode = (event: KeyboardEvent | undefined, action: 'draw' | 'redraw'): void => {
        event?.preventDefault();
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
                // in this case, if a mask or polyline is being edited we probably want to finish editing first
                canvasInstance.edit({ enabled: false });
                return;
            }

            canvasInstance.cancel();
            // repeatDrawShape gets all the latest parameters
            // and calls canvasInstance.draw() with them

            if (action === 'draw') {
                repeatDrawShape();
            } else {
                redrawShape();
            }
        } else {
            if ([ActiveControl.AI_TOOLS, ActiveControl.OPENCV_TOOLS].includes(activeControl)) {
                // separated API method
                canvasInstance.interact({ enabled: false });
                return;
            }

            canvasInstance.draw({ enabled: false });
        }
    };

    if (!controlsDisabled) {
        handlers = {
            ...handlers,
            PASTE_SHAPE: (event: KeyboardEvent | undefined) => {
                event?.preventDefault();
                canvasInstance.cancel();
                pasteShape();
            },
            SWITCH_DRAW_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
                handleDrawMode(event, 'draw');
            },
            SWITCH_REDRAW_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
                handleDrawMode(event, 'redraw');
            },
        };
    }

    return (
        <ContainerHeightContext.Provider value={containerHeight}>
            <Layout.Sider ref={containerRef} className='cvat-canvas-controls-sidebar' theme='light' width={44}>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />

                <ObservedToolsControl />
                <ObservedOpenCVControl />
                <ObservedRabbitControl />
                <NCPObservedSetupTagControl disabled={controlsDisabled} />




            </Layout.Sider>
        </ContainerHeightContext.Provider>
    );
}
