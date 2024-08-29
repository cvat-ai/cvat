// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
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
        name: 'Paste shape',
        description: 'Paste a shape from internal CVAT clipboard',
        sequences: ['ctrl+v'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_DRAW_MODE_STANDARD_3D_CONTROLS: {
        name: 'Draw mode',
        description:
            'Repeat the latest procedure of drawing with the same parameters',
        sequences: ['n'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE_CONTROLS'],
    },
    SWITCH_REDRAW_MODE_STANDARD_3D_CONTROLS: {
        name: 'Redraw shape',
        description: 'Remove selected shape and redraw it from scratch',
        sequences: ['shift+n'],
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

    const handlers: any = applicableLabels.length ? {
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
    } : {};

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
                updateActiveControl={updateActiveControl}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                disabled={controlsDisabled}
            />
            <ObservedGroupControl
                updateActiveControl={updateActiveControl}
                resetGroup={resetGroup}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                disabled={controlsDisabled}
            />
            <ObservedSplitControl
                updateActiveControl={updateActiveControl}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                disabled={controlsDisabled}
            />
        </Layout.Sider>
    );
}
