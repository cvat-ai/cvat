// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    ReactElement, SyntheticEvent, useEffect, useRef, useState,
} from 'react';
import Layout from 'antd/lib/layout/layout';
import {
    ArrowUpOutlined, ArrowRightOutlined, ArrowLeftOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { ResizableBox } from 'react-resizable';
import { Workspace } from 'reducers/interfaces';
import {
    Canvas3d, MouseInteraction, ViewType, CAMERA_ACTION,
} from 'cvat-canvas3d-wrapper';
import ContextImage from '../standard3D-workspace/context-image/context-image';
import CVATTooltip from '../../common/cvat-tooltip';

interface Props {
    canvasInstance: Canvas3d;
    jobInstance: any;
    frameData: any;
    curZLayer: number;
    contextImageHide: boolean;
    loaded: boolean;
    data: string;
    annotations: any[];
    onSetupCanvas: () => void;
    getContextImage(): void;
    onResetCanvas(): void;
    workspace: Workspace;
    animateID: any;
    automaticBordering: boolean;
    showObjectsTextAlways: boolean;
}

const CanvasWrapperComponent = (props: Props): ReactElement => {
    const animateId = useRef(0);
    const perspectiveView = useRef<HTMLCanvasElement>(null);
    const topView = useRef<HTMLCanvasElement>(null);
    const sideView = useRef<HTMLCanvasElement>(null);
    const frontView = useRef<HTMLCanvasElement>(null);

    const [orthographicViewSize, setOrthographicViewSize] = useState({
        vertical: document.body.clientHeight / 2,
        top: 0,
        side: 0,
        front: 0,
    });

    const {
        frameData, contextImageHide, getContextImage, loaded, data, annotations, curZLayer,
    } = props;

    const onCanvasSetup = (): void => {
        const { onSetupCanvas } = props;
        onSetupCanvas();
    };

    const animateCanvas = (): void => {
        const { canvasInstance } = props;

        canvasInstance.render();
        animateId.current = requestAnimationFrame(animateCanvas);
    };

    const updateCanvas = (): void => {
        const { canvasInstance } = props;

        if (frameData !== null) {
            canvasInstance.setup(frameData);
        }
    };

    const onMouseClick = (event: MouseEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.mouseControls(MouseInteraction.CLICK, event);
    };

    const onMouseDoubleClick = (event: MouseEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.mouseControls(MouseInteraction.DOUBLE_CLICK, event);
    };

    const onMouseHover = (event: MouseEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.mouseControls(MouseInteraction.HOVER, event);
    };

    const onCanvasCancel = (): void => {
        const { onResetCanvas } = props;
        onResetCanvas();
    };

    const initialSetup = (): void => {
        const { canvasInstance } = props;

        const canvasInstanceDOM = canvasInstance.html();
        // Events
        canvasInstanceDOM.perspective.addEventListener('canvas.setup', onCanvasSetup);
        canvasInstanceDOM.perspective.addEventListener('mousemove', onMouseHover);
        canvasInstanceDOM.perspective.addEventListener('canvas.canceled', onCanvasCancel);
        canvasInstanceDOM.perspective.addEventListener(MouseInteraction.DOUBLE_CLICK, onMouseDoubleClick);
        canvasInstanceDOM.perspective.addEventListener(MouseInteraction.CLICK, onMouseClick);
    };

    const keyControls = (key: KeyboardEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.keyControls(key);
    };

    const onPerspectiveViewResize = (e: SyntheticEvent): void => {
        const event = (e as unknown) as MouseEvent;
        const canvas3dContainer = document.getElementById('canvas3d-container');
        if (canvas3dContainer) {
            const height =
                canvas3dContainer.clientHeight + canvas3dContainer.getBoundingClientRect().top - event.clientY;
            setOrthographicViewSize({ ...orthographicViewSize, vertical: height });
        }
    };

    const onOrthographicViewResize = (view: string, e: SyntheticEvent): void => {
        const event = (e as unknown) as MouseEvent;
        const canvas3dContainer = document.getElementById('canvas3d-container');
        if (canvas3dContainer) {
            const width = event.clientX - canvas3dContainer.getBoundingClientRect().left;
            if (view === ViewType.TOP) {
                const topWidth = orthographicViewSize.top;
                if (topWidth < width) {
                    const top = orthographicViewSize.top + (width - topWidth);
                    const side = orthographicViewSize.side - (width - topWidth);
                    setOrthographicViewSize({
                        ...orthographicViewSize,
                        top,
                        side,
                    });
                } else {
                    const top = orthographicViewSize.top - (topWidth - width);
                    const side = orthographicViewSize.side + (topWidth - width);
                    setOrthographicViewSize({
                        ...orthographicViewSize,
                        top,
                        side,
                    });
                }
            }
            if (view === ViewType.SIDE) {
                const topSideWidth = orthographicViewSize.top + orthographicViewSize.side;
                if (topSideWidth < width) {
                    const side = orthographicViewSize.side + (width - topSideWidth);
                    const front = orthographicViewSize.front - (width - topSideWidth);
                    setOrthographicViewSize({
                        ...orthographicViewSize,
                        side,
                        front,
                    });
                } else {
                    const side = orthographicViewSize.side - (topSideWidth - width);
                    const front = orthographicViewSize.front + (topSideWidth - width);
                    setOrthographicViewSize({
                        ...orthographicViewSize,
                        side,
                        front,
                    });
                }
            }
        }
    };

    useEffect(() => {
        const { canvasInstance } = props;

        const canvasInstanceDOM = canvasInstance.html();

        if (
            perspectiveView &&
            perspectiveView.current &&
            topView &&
            topView.current &&
            sideView &&
            sideView.current &&
            frontView &&
            frontView.current
        ) {
            perspectiveView.current.appendChild(canvasInstanceDOM.perspective);
            topView.current.appendChild(canvasInstanceDOM.top);
            sideView.current.appendChild(canvasInstanceDOM.side);
            frontView.current.appendChild(canvasInstanceDOM.front);
            const canvas3dContainer = document.getElementById('canvas3d-container');
            if (canvas3dContainer && orthographicViewSize.top === 0) {
                const width = canvas3dContainer.clientWidth / 3;
                setOrthographicViewSize({
                    ...orthographicViewSize,
                    top: width,
                    side: width,
                    front: width,
                });
            }
        }

        document.addEventListener('keydown', keyControls);

        initialSetup();
        updateCanvas();
        animateCanvas();

        return () => {
            canvasInstanceDOM.perspective.removeEventListener('canvas.setup', onCanvasSetup);
            canvasInstanceDOM.perspective.removeEventListener('mousemove', onMouseHover);
            canvasInstanceDOM.perspective.removeEventListener('canvas.canceled', onCanvasCancel);
            canvasInstanceDOM.perspective.removeEventListener(MouseInteraction.DOUBLE_CLICK, onMouseDoubleClick);
            canvasInstanceDOM.perspective.removeEventListener(MouseInteraction.CLICK, onMouseClick);
            document.removeEventListener('keydown', keyControls);
            cancelAnimationFrame(animateId.current);
        };
    }, []);

    useEffect(() => {
        updateCanvas();
    }, [frameData, annotations, curZLayer]);

    const screenKeyControl = (code: CAMERA_ACTION): void => {
        const { canvasInstance } = props;
        canvasInstance.keyControls(new KeyboardEvent('keydown', { code, altKey: true }));
    };

    const ArrowGroup = (): ReactElement => (
        <span className='cvat-canvas3d-perspective-arrow-directions'>
            <CVATTooltip title='Arrow Up' placement='topRight'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.TILT_UP)}
                    type='button'
                    className='cvat-canvas3d-perspective-arrow-directions-icons-up'
                >
                    <ArrowUpOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                </button>
            </CVATTooltip>
            <br />
            <CVATTooltip title='Arrow Left' placement='topRight'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.ROTATE_LEFT)}
                    type='button'
                    className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'
                >
                    <ArrowLeftOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                </button>
            </CVATTooltip>
            <CVATTooltip title='Arrow Bottom' placement='topRight'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.TILT_DOWN)}
                    type='button'
                    className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'
                >
                    <ArrowDownOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                </button>
            </CVATTooltip>
            <CVATTooltip title='Arrow Right' placement='topRight'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.ROTATE_RIGHT)}
                    type='button'
                    className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'
                >
                    <ArrowRightOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                </button>
            </CVATTooltip>
        </span>
    );

    const ControlGroup = (): ReactElement => (
        <span className='cvat-canvas3d-perspective-directions'>
            <CVATTooltip title='Alt+U' placement='topLeft'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.MOVE_UP)}
                    type='button'
                    className='cvat-canvas3d-perspective-directions-icon'
                >
                    U
                </button>
            </CVATTooltip>
            <CVATTooltip title='Alt+I' placement='topLeft'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.ZOOM_IN)}
                    type='button'
                    className='cvat-canvas3d-perspective-directions-icon'
                >
                    I
                </button>
            </CVATTooltip>
            <CVATTooltip title='Alt+O' placement='topLeft'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.MOVE_DOWN)}
                    type='button'
                    className='cvat-canvas3d-perspective-directions-icon'
                >
                    O
                </button>
            </CVATTooltip>
            <br />
            <CVATTooltip title='Alt+J' placement='topLeft'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.MOVE_LEFT)}
                    type='button'
                    className='cvat-canvas3d-perspective-directions-icon'
                >
                    J
                </button>
            </CVATTooltip>
            <CVATTooltip title='Alt+K' placement='topLeft'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.ZOOM_OUT)}
                    type='button'
                    className='cvat-canvas3d-perspective-directions-icon'
                >
                    K
                </button>
            </CVATTooltip>
            <CVATTooltip title='Alt+L' placement='topLeft'>
                <button
                    onClick={() => screenKeyControl(CAMERA_ACTION.MOVE_RIGHT)}
                    type='button'
                    className='cvat-canvas3d-perspective-directions-icon'
                >
                    L
                </button>
            </CVATTooltip>
        </span>
    );

    return (
        <Layout.Content className='cvat-canvas3d-fullsize' id='canvas3d-container'>
            <ContextImage
                frame={frameData}
                contextImageHide={contextImageHide}
                getContextImage={getContextImage}
                loaded={loaded}
                data={data}
            />
            <ResizableBox
                className='cvat-resizable'
                width={Infinity}
                height={document.body.clientHeight / 2}
                axis='y'
                handle={<span className='cvat-resizable-handle-horizontal' />}
                onResize={onPerspectiveViewResize}
            >
                <div className='cvat-canvas3d-perspective'>
                    <div className='cvat-canvas-container cvat-canvas-container-overflow' ref={perspectiveView} />
                    <ArrowGroup />
                    <ControlGroup />
                </div>
            </ResizableBox>
            <div className='cvat-canvas3d-orthographic-views' style={{ height: orthographicViewSize.vertical }}>
                <ResizableBox
                    className='cvat-resizable'
                    width={orthographicViewSize.top}
                    height={orthographicViewSize.vertical}
                    axis='x'
                    handle={<span className='cvat-resizable-handle-vertical-top' />}
                    onResize={(e: SyntheticEvent) => onOrthographicViewResize('top', e)}
                >
                    <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-topview'>
                        <div className='cvat-canvas3d-header'>TOP</div>
                        <div className='cvat-canvas3d-fullsize' ref={topView} />
                    </div>
                </ResizableBox>
                <ResizableBox
                    className='cvat-resizable'
                    width={orthographicViewSize.side}
                    height={orthographicViewSize.vertical}
                    axis='x'
                    handle={<span className='cvat-resizable-handle-vertical-side' />}
                    onResize={(e: SyntheticEvent) => onOrthographicViewResize('side', e)}
                >
                    <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-sideview'>
                        <div className='cvat-canvas3d-header'>SIDE</div>
                        <div className='cvat-canvas3d-fullsize' ref={sideView} />
                    </div>
                </ResizableBox>
                <div
                    className='cvat-canvas3d-orthographic-view cvat-canvas3d-frontview'
                    style={{ width: orthographicViewSize.front }}
                >
                    <div className='cvat-canvas3d-header'>FRONT</div>
                    <div className='cvat-canvas3d-fullsize' ref={frontView} />
                </div>
            </div>
        </Layout.Content>
    );
};

export default React.memo(CanvasWrapperComponent);
