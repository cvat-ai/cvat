import React from 'react';

import {
    Icon,
    Layout,
    Tooltip,
} from 'antd';

import {
    RectangleIcon,
    PolygonIcon,
    PointIcon,
    PolylineIcon,
    TagIcon,
    MergeIcon,
    GroupIcon,
    SplitIcon,
} from '../../../../icons';

import {
    ActiveControl,
} from '../../../../reducers/interfaces';

import {
    Canvas,
} from '../../../../canvas';

import CursorControl from './cursor-control';
import MoveControl from './move-control';
import RotateControl from './rotate-control';
import FitControl from './fit-control';
import ResizeControl from './resize-control';

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

            <Tooltip overlay='Draw a rectangle' placement='right'>
                <Icon component={RectangleIcon} />
            </Tooltip>

            <Tooltip overlay='Draw a polygon' placement='right'>
                <Icon component={PolygonIcon} />
            </Tooltip>

            <Tooltip overlay='Draw a polyline' placement='right'>
                <Icon component={PolylineIcon} />
            </Tooltip>

            <Tooltip overlay='Draw points' placement='right'>
                <Icon component={PointIcon} />
            </Tooltip>

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
