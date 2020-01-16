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
    MergeIcon,
    GroupIcon,
    SplitIcon,
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

interface Props {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
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
            <Tooltip overlay='Merge shapes/tracks' placement='right'>
                <Icon component={MergeIcon} />
            </Tooltip>

            <Tooltip overlay='Group shapes/tracks' placement='right'>
                <Icon component={GroupIcon} />
            </Tooltip>

            <Tooltip overlay='Split a track' placement='right'>
                <Icon component={SplitIcon} />
            </Tooltip>
        </Layout.Sider>
    );
}
