// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

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
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance,
        activeControl,

        mergeObjects,
        groupObjects,
        splitTrack,
        rotateFrame,
    } = props;

    return (
        <Layout.Sider
            className='cvat-canvas-controls-sidebar'
            theme='light'
            width={44}
        >
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
