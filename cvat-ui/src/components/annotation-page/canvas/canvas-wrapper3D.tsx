// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    ReactElement, useEffect, useRef, useState,
} from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import Layout from 'antd/lib/layout/layout';
import {
    ArrowUpOutlined, ArrowRightOutlined, ArrowLeftOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { ResizableBox } from 'react-resizable';
import { Workspace } from 'reducers/interfaces';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import ContextImage from '../standard3D-workspace/context-image/context-image';
import { ViewType } from '../../../reducers/interfaces';

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
        vertical: '50%',
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
        canvasInstance.mouseControls('click', event);
    };

    const onMouseDoubleClick = (event: MouseEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.mouseControls('dblclick', event);
    };

    const onMouseHover = (event: MouseEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.mouseControls('hover', event);
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
        canvasInstanceDOM.perspective.addEventListener('dblclick', onMouseDoubleClick);
        canvasInstanceDOM.perspective.addEventListener('click', onMouseClick);
    };

    const keyControls = (key: KeyboardEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.keyControls(key);
    };

    const onPerspectiveViewResize = (e: MouseEvent): void => {
        const canvas3dContainer = document.getElementById('canvas3d-container');
        if (canvas3dContainer) {
            const height = canvas3dContainer.clientHeight + canvas3dContainer.getBoundingClientRect().top - e.clientY;
            setOrthographicViewSize({ ...orthographicViewSize, vertical: height });
        }
    };

    const onOrthographicViewResize = (view: string, e: MouseEvent): void => {
        const canvas3dContainer = document.getElementById('canvas3d-container');
        if (canvas3dContainer) {
            const width = e.clientX - canvas3dContainer.getBoundingClientRect().left;
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
            canvasInstanceDOM.perspective.removeEventListener('dblclick', onMouseDoubleClick);
            canvasInstanceDOM.perspective.removeEventListener('click', onMouseClick);
            document.removeEventListener('keydown', keyControls);
            cancelAnimationFrame(animateId.current);
        };
    });

    useEffect(() => {
        updateCanvas();
    }, [frameData, annotations, curZLayer]);

    const renderArrowGroup = (): ReactElement => (
        <span className='cvat-canvas3d-perspective-arrow-directions'>
            <button type='button' className='cvat-canvas3d-perspective-arrow-directions-icons-up'>
                <ArrowUpOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
            </button>
            <br />
            <button type='button' className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'>
                <ArrowLeftOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
            </button>
            <button type='button' className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'>
                <ArrowDownOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
            </button>
            <button type='button' className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'>
                <ArrowRightOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
            </button>
        </span>
    );

    const renderControlGroup = (): ReactElement => (
        <span className='cvat-canvas3d-perspective-directions'>
            <button type='button' className='cvat-canvas3d-perspective-directions-icon'>
                U
            </button>
            <button type='button' className='cvat-canvas3d-perspective-directions-icon'>
                I
            </button>
            <button type='button' className='cvat-canvas3d-perspective-directions-icon'>
                O
            </button>
            <br />
            <button type='button' className='cvat-canvas3d-perspective-directions-icon'>
                J
            </button>
            <button type='button' className='cvat-canvas3d-perspective-directions-icon'>
                K
            </button>
            <button type='button' className='cvat-canvas3d-perspective-directions-icon'>
                L
            </button>
        </span>
    );

    return (
        <Layout.Content className='cvat-canvas3d-fullsize' id='canvas3d-container'>
            <GlobalHotKeys />

            <ContextImage
                frame={frameData}
                contextImageHide={contextImageHide}
                getContextImage={getContextImage}
                loaded={loaded}
                data={data}
            />
            <ResizableBox
                width='100%'
                height={document.body.clientHeight / 2}
                handle={<span className='react-resizable-handle-horizontal' />}
                onResize={onPerspectiveViewResize}
            >
                <div className='cvat-canvas3d-perspective'>
                    <div className='cvat-canvas-container cvat-canvas-container-overflow' ref={perspectiveView} />
                    {renderArrowGroup()}
                    {renderControlGroup()}
                </div>
            </ResizableBox>
            <div className='cvat-canvas3d-orthographic-views' style={{ height: orthographicViewSize.vertical }}>
                <ResizableBox
                    width={orthographicViewSize.top}
                    height={orthographicViewSize.vertical}
                    axis='both'
                    handle={<span className='react-resizable-handle-vertical-top' />}
                    onResize={(e: MouseEvent) => onOrthographicViewResize('top', e)}
                >
                    <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-topview'>
                        <div className='cvat-canvas3d-header'>TOP VIEW</div>
                        <div className='cvat-canvas3d-fullsize' ref={topView} />
                    </div>
                </ResizableBox>
                <ResizableBox
                    width={orthographicViewSize.side}
                    height={orthographicViewSize.vertical}
                    axis='both'
                    handle={<span className='react-resizable-handle-vertical-side' />}
                    onResize={(e: MouseEvent) => onOrthographicViewResize('side', e)}
                >
                    <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-sideview'>
                        <div className='cvat-canvas3d-header'>SIDE VIEW</div>
                        <div className='cvat-canvas3d-fullsize' ref={sideView} />
                    </div>
                </ResizableBox>
                <div
                    className='cvat-canvas3d-orthographic-view cvat-canvas3d-frontview'
                    style={{ width: orthographicViewSize.front }}
                >
                    <div className='cvat-canvas3d-header'>FRONT VIEW</div>
                    <div className='cvat-canvas3d-fullsize' ref={frontView} />
                </div>
            </div>
        </Layout.Content>
    );
};

export default React.memo(CanvasWrapperComponent);
