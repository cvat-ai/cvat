import React from 'react';

import {
    Icon,
    Layout,
    Tooltip,
} from 'antd';

import {
    ActiveControl,
} from 'reducers/interfaces';

import {
    TagIcon,
} from 'icons';

import {
    Canvas,
} from 'cvat-canvas';

import CursorControl from './cursor-control';
import MoveControl from './move-control';
import RotateControl from './rotate-control';
import FitControl from './fit-control';
import ResizeControl from './resize-control';
import DrawRectangleControl from './draw-rectangle-control';
import DrawPolygonControl from './draw-polygon-control';
import DrawPolylineControl from './draw-polyline-control';
import DrawPointsControl from './draw-points-control';
import MergeControl from './merge-control';
import GroupControl from './group-control';
import SplitControl from './split-control';

interface Props {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;

    mergeObjects(enabled: boolean): void;
    groupObjects(enabled: boolean): void;
    splitTrack(enabled: boolean): void;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        canvasInstance,
        activeControl,
        rotateAll,

        mergeObjects,
        groupObjects,
        splitTrack,
    } = props;

    return (
        <Layout.Sider
            className='cvat-canvas-controls-sidebar'
            theme='light'
            width={44}
        >
            <CursorControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <MoveControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <RotateControl canvasInstance={canvasInstance} rotateAll={rotateAll} />

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

            <Tooltip overlay='Setup a tag' placement='right'>
                <Icon component={TagIcon} />
            </Tooltip>

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
