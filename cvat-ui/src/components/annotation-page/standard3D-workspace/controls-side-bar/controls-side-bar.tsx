// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';
import { ActiveControl } from 'reducers/interfaces';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import CursorControl from './cursor-control';
import MoveControl from './move-control';
import DrawCuboidControl from './draw-cuboid-control';
import PhotoContextControl from './photo-context';
import ControlVisibilityObserver from '../../standard-workspace/controls-side-bar/control-visibility-observer';
import { Props as MoveControlProps } from '../../standard-workspace/controls-side-bar/move-control';
import { Props as CursorControlProps } from '../../standard-workspace/controls-side-bar/cursor-control';
import { Props as DrawCuboidControlProps } from '../../standard-workspace/controls-side-bar/draw-cuboid-control';

interface Props {
    keyMap: KeyMap;
    canvasInstance: Canvas | Canvas3d;
    activeControl: ActiveControl;
    normalizedKeyMap: Record<string, string>;
    contextImageHide: boolean;
    hideShowContextImage: (hidden: boolean) => void;
    labels: any[];
    repeatDrawShape(): void;
    redrawShape(): void;
    pasteShape(): void;
}

const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(CursorControl);
const ObservedMoveControl = ControlVisibilityObserver<MoveControlProps>(MoveControl);
const ObservedDrawCuboidControl = ControlVisibilityObserver<DrawCuboidControlProps>(DrawCuboidControl);

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance,
        pasteShape,
        activeControl,
        normalizedKeyMap,
        contextImageHide,
        hideShowContextImage,
        keyMap,
        labels,
        redrawShape,
        repeatDrawShape,
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
        };
        subKeyMap = {
            ...subKeyMap,
            PASTE_SHAPE: keyMap.PASTE_SHAPE,
            SWITCH_DRAW_MODE: keyMap.SWITCH_DRAW_MODE,
        };
    }

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
            <ObservedMoveControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <ObservedCursorControl
                cursorShortkey={normalizedKeyMap.CANCEL}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
            />
            <ObservedDrawCuboidControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_CUBOID}
                disabled={!labels.length}
            />
            <PhotoContextControl
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                contextImageHide={contextImageHide}
                hideShowContextImage={hideShowContextImage}
            />
        </Layout.Sider>
    );
}
