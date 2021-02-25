// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import Layout from 'antd/lib/layout';

import { ActiveControl } from 'reducers/interfaces';
import { Canvas3d as Canvas } from 'cvat-canvas3d-wrapper';

import CursorControl from './cursor-control';
import MoveControl from './move-control';

import DrawCuboidControl from './draw-cuboid-control';

import PhotoContextControl from './photo-context';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    normalizedKeyMap: Record<string, string>;
    contextImageHide: boolean;
    hideShowContextImage: (hidden: boolean) => void;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance, activeControl, normalizedKeyMap, contextImageHide, hideShowContextImage,
    } = props;

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <GlobalHotKeys />

            <MoveControl canvasInstance={canvasInstance} activeControl={activeControl} />

            <CursorControl
                cursorShortkey={normalizedKeyMap.CANCEL}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
            />

            <DrawCuboidControl
                canvasInstance={canvasInstance}
                isDrawing={activeControl === ActiveControl.DRAW_CUBOID}
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
