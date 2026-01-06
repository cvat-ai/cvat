// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';
import { ActiveControl } from 'reducers';
import { Label, LabelType } from 'cvat-core-wrapper';
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
import MergeControl, {
    Props as MergeControlProps,
} from 'components/annotation-page/standard-workspace/controls-side-bar/merge-control';
import SplitControl, {
    Props as SplitControlProps,
} from 'components/annotation-page/standard-workspace/controls-side-bar/split-control';
import GlobalHotKeys, { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import ControlVisibilityObserver from 'components/annotation-page/standard-workspace/controls-side-bar/control-visibility-observer';
import { filterApplicableForType } from 'utils/filter-applicable-labels';
import { subKeyMap } from 'utils/component-subkeymap';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';

interface Props {
    keyMap: KeyMap;
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    normalizedKeyMap: Record<string, string>;
    labels: Label[];
    jobInstance: any;
    repeatDrawShape(): void;
    redrawShape(): void;
    pasteShape(): void;
    resetGroup(): void;
    updateActiveControl(activeControl: ActiveControl): void;
}

const componentShortcuts: Record<string, KeyMapItem> = {
    PASTE_SHAPE: {
        name: '粘贴形状',
        description: '从 CVAT 内部剪贴板粘贴形状',
        sequences: ['ctrl+v'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_DRAW_MODE_STANDARD_3D_CONTROLS: {
        name: '绘制模式',
        description:
            '以相同参数重复上一次绘制流程',
        sequences: ['n'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
    SWITCH_REDRAW_MODE_STANDARD_3D_CONTROLS: {
        name: '重绘形状',
        description: '删除选中的形状并从头重绘',
        sequences: ['shift+n'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
    SWITCH_GROUP_MODE_STANDARD_3D_CONTROLS: {
        name: '分组模式',
        description: '启用或关闭形状分组模式',
        sequences: ['g'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
    RESET_GROUP_STANDARD_3D_CONTROLS: {
        name: '重置分组',
        description: '在分组模式下重置选中形状的分组',
        sequences: ['shift+g'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
    SWITCH_MERGE_MODE_STANDARD_3D_CONTROLS: {
        name: '合并模式',
        description: '启用或关闭形状合并模式',
        sequences: ['m'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
    SWITCH_SPLIT_MODE_STANDARD_3D_CONTROLS: {
        name: '拆分模式',
        description: '启用或关闭形状拆分模式',
        sequences: ['alt+m'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
};

registerComponentShortcuts(componentShortcuts);

const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(CursorControl);
const ObservedMoveControl = ControlVisibilityObserver<MoveControlProps>(MoveControl);
const ObservedDrawCuboidControl = ControlVisibilityObserver<DrawCuboidControlProps>(DrawCuboidControl);
const ObservedGroupControl = ControlVisibilityObserver<GroupControlProps>(GroupControl);
const ObservedMergeControl = ControlVisibilityObserver<MergeControlProps>(MergeControl);
const ObservedSplitControl = ControlVisibilityObserver<SplitControlProps>(SplitControl);

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
        updateActiveControl,
        resetGroup,
    } = props;

    const applicableLabels = filterApplicableForType(LabelType.CUBOID, labels);
    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    const handleDrawMode = (event: KeyboardEvent | undefined, action: 'draw' | 'redraw'): void => {
        preventDefault(event);
        const drawing = [ActiveControl.DRAW_CUBOID].includes(activeControl);
        if (!drawing) {
            canvasInstance.cancel();
            if (action === 'draw') {
                repeatDrawShape();
            } else {
                redrawShape();
            }
        } else {
            canvasInstance.draw({ enabled: false });
        }
    };

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

    let handlers: any = {
        SWITCH_GROUP_MODE_STANDARD_3D_CONTROLS: (event: KeyboardEvent | undefined): void => {
            if (event) event.preventDefault();
            dynamicGroupIconProps.onClick();
        },
        RESET_GROUP_STANDARD_3D_CONTROLS: (event: KeyboardEvent | undefined): void => {
            if (event) event.preventDefault();
            const grouping = activeControl === ActiveControl.GROUP;
            if (!grouping) {
                return;
            }
            resetGroup();
            canvasInstance.group({ enabled: false });
            updateActiveControl(ActiveControl.CURSOR);
        },
        SWITCH_MERGE_MODE_STANDARD_3D_CONTROLS: (event: KeyboardEvent | undefined): void => {
            if (event) event.preventDefault();
            dynamicMergeIconProps.onClick();
        },
        SWITCH_SPLIT_MODE_STANDARD_3D_CONTROLS: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicTrackIconProps.onClick();
        },
    };

    handlers = applicableLabels.length ? {
        ...handlers,
        PASTE_SHAPE: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            canvasInstance.cancel();
            pasteShape();
        },
        SWITCH_DRAW_MODE_STANDARD_3D_CONTROLS: (event: KeyboardEvent | undefined) => {
            handleDrawMode(event, 'draw');
        },
        SWITCH_REDRAW_MODE_STANDARD_3D_CONTROLS: (event: KeyboardEvent | undefined) => {
            handleDrawMode(event, 'redraw');
        },
    } : { ...handlers };

    const controlsDisabled = !applicableLabels.length;
    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <GlobalHotKeys
                keyMap={applicableLabels.length ? subKeyMap(componentShortcuts, keyMap) : {}}
                handlers={handlers}
            />
            <ObservedCursorControl
                cursorShortkey={normalizedKeyMap.CANCEL}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
            />
            <ObservedMoveControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <ObservedDrawCuboidControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_CUBOID}
                disabled={controlsDisabled}
            />

            <hr />

            <ObservedMergeControl
                canvasInstance={canvasInstance}
                dynamicIconProps={dynamicMergeIconProps}
                disabled={controlsDisabled}
            />
            <ObservedGroupControl
                canvasInstance={canvasInstance}
                dynamicIconProps={dynamicGroupIconProps}
                disabled={controlsDisabled}
            />
            <ObservedSplitControl
                canvasInstance={canvasInstance}
                dynamicIconProps={dynamicTrackIconProps}
                disabled={controlsDisabled}
            />
        </Layout.Sider>
    );
}
