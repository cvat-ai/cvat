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

    onMergeStart(): void;
    onGroupStart(): void;
    onSplitStart(): void;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    return (
        <Layout.Sider
            className='cvat-annotation-page-controls-sidebar'
            theme='light'
            width={44}
        >
            <CursorControl {...props} />
            <MoveControl {...props} />
            <RotateControl {...props} />

            <hr />

            <FitControl {...props} />
            <ResizeControl {...props} />

            <hr />

            <DrawRectangleControl {...props} />
            <DrawPolygonControl {...props} />
            <DrawPolylineControl {...props} />
            <DrawPointsControl {...props} />

            <Tooltip overlay='Setup a tag' placement='right'>
                <Icon component={TagIcon} />
            </Tooltip>

            <hr />

            <MergeControl {...props} />
            <GroupControl {...props} />
            <SplitControl {...props} />
        </Layout.Sider>
    );
}
