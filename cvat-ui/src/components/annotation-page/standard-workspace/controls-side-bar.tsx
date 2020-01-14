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
    ActiveControl,
} from '../../../reducers/interfaces';

import {
    Canvas,
    Rotation,
} from '../../../canvas';

interface Props {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
}

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        rotateAll,
        canvasInstance,
        activeControl,
    } = props;

    return (
        <Layout.Sider
            className='cvat-annotation-page-controls-sidebar'
            theme='light'
            width={44}
        >
            <Tooltip overlay='Cursor' placement='right'>
                <Icon
                    component={CursorIcon}
                    className={activeControl === ActiveControl.CURSOR
                        ? 'cvat-annotation-page-active-control' : ''
                    }
                    onClick={(): void => {
                        if (activeControl !== ActiveControl.CURSOR) {
                            canvasInstance.cancel();
                        }
                    }}
                />
            </Tooltip>

            <Tooltip overlay='Move the image' placement='right'>
                <Icon
                    component={MoveIcon}
                    className={activeControl === ActiveControl.DRAG_CANVAS
                        ? 'cvat-annotation-page-active-control' : ''
                    }
                    onClick={(): void => {
                        if (activeControl === ActiveControl.DRAG_CANVAS) {
                            canvasInstance.dragCanvas(false);
                        } else {
                            canvasInstance.cancel();
                            canvasInstance.dragCanvas(true);
                        }
                    }}
                />
            </Tooltip>

            <Popover
                overlayClassName='cvat-annotation-page-controls-rotate'
                placement='right'
                content={(
                    <>
                        <Tooltip overlay='Rotate the image anticlockwise' placement='topRight'>
                            <Icon
                                className='cvat-annotation-page-controls-rotate-left'
                                onClick={(): void => canvasInstance
                                    .rotate(Rotation.ANTICLOCKWISE90, rotateAll)}
                                component={RotateIcon}
                            />
                        </Tooltip>
                        <Tooltip overlay='Rotate the image clockwise' placement='topRight'>
                            <Icon
                                className='cvat-annotation-page-controls-rotate-right'
                                onClick={(): void => canvasInstance
                                    .rotate(Rotation.CLOCKWISE90, rotateAll)}
                                component={RotateIcon}
                            />
                        </Tooltip>
                    </>
                )}
                trigger='hover'
            >
                <Icon component={RotateIcon} />
            </Popover>

            <hr />

            <Tooltip overlay='Fit the image' placement='right'>
                <Icon component={FitIcon} onClick={(): void => canvasInstance.fit()} />
            </Tooltip>

            <Tooltip overlay='Zoom the image' placement='right'>
                <Icon
                    component={ZoomIcon}
                    className={activeControl === ActiveControl.ZOOM_CANVAS
                        ? 'cvat-annotation-page-active-control' : ''
                    }
                    onClick={(): void => {
                        if (activeControl === ActiveControl.ZOOM_CANVAS) {
                            canvasInstance.zoomCanvas(false);
                        } else {
                            canvasInstance.cancel();
                            canvasInstance.zoomCanvas(true);
                        }
                    }}
                />
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
