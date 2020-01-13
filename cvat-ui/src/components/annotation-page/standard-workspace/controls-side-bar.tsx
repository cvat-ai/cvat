import React from 'react';

import {
    Icon,
    Layout,
    Tooltip,
    Popover,
} from 'antd';

import {
    CursorIcon,
    MoveIcon,
    RotateIcon,
    FitIcon,
    ZoomIcon,
    RectangleIcon,
    PolygonIcon,
    PointIcon,
    PolylineIcon,
    TagIcon,
    MergeIcon,
    GroupIcon,
    SplitIcon,
} from '../../../icons';

import {
    Canvas,
    Rotation,
} from '../../../canvas';

interface Props {
    canvasInstance: Canvas;
    rotateAll: boolean;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        rotateAll,
        canvasInstance,
    } = props;

    return (
        <Layout.Sider
            className='cvat-annotation-page-controls-sidebar'
            theme='light'
            width={44}
        >
            <Tooltip overlay='Cursor' placement='right'>
                <Icon component={CursorIcon} />
            </Tooltip>

            <Tooltip overlay='Move the image' placement='right'>
                <Icon component={MoveIcon} />
            </Tooltip>

            <Popover
                overlayClassName='cvat-annotation-page-controls-rotate'
                placement='right'
                content={(
                    <>
                        <Icon
                            className='cvat-annotation-page-controls-rotate-left'
                            onClick={(): void => canvasInstance
                                .rotate(Rotation.ANTICLOCKWISE90, rotateAll)}
                            component={RotateIcon}
                        />
                        <Icon
                            className='cvat-annotation-page-controls-rotate-right'
                            onClick={(): void => canvasInstance
                                .rotate(Rotation.CLOCKWISE90, rotateAll)}
                            component={RotateIcon}
                        />
                    </>
                )}
                trigger='hover'
            >
                <Tooltip overlay='Rotate the image' placement='topRight'>
                    <Icon component={RotateIcon} />
                </Tooltip>
            </Popover>

            <hr />

            <Tooltip overlay='Fit the image' placement='right'>
                <Icon component={FitIcon} />
            </Tooltip>

            <Tooltip overlay='Zoom the image' placement='right'>
                <Icon component={ZoomIcon} />
            </Tooltip>

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
