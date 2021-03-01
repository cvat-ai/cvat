// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactElement, useEffect, useRef } from 'react';
import Layout from 'antd/lib/layout/layout';
import {
    ArrowUpOutlined, ArrowRightOutlined, ArrowLeftOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { Workspace } from 'reducers/interfaces';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import ContextImage from '../standard3D-workspace/context-image/context-image';

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

    const initialSetup = (): void => {
        const { canvasInstance } = props;

        const canvasInstanceDOM = canvasInstance.html();
        // Events
        canvasInstanceDOM.perspective.addEventListener('canvas.setup', onCanvasSetup);
    };

    const keyControls = (key: KeyboardEvent): void => {
        const { canvasInstance } = props;
        canvasInstance.keyControls(key);
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
        }

        document.addEventListener('keydown', keyControls);

        initialSetup();
        updateCanvas();
        animateCanvas();

        return () => {
            canvasInstanceDOM.perspective.removeEventListener('canvas.setup', onCanvasSetup);
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
        <Layout.Content className='cvat-canvas3d-fullsize'>
            <ContextImage
                frame={frameData}
                contextImageHide={contextImageHide}
                getContextImage={getContextImage}
                loaded={loaded}
                data={data}
            />

            <div className='cvat-canvas3d-perspective'>
                <div className='cvat-canvas-container cvat-canvas-container-overflow' ref={perspectiveView} />
                {renderArrowGroup()}
                {renderControlGroup()}
            </div>
            <div className='cvat-canvas3d-orthographic-views'>
                <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-topview'>
                    <div className='cvat-canvas3d-header'>TOP VIEW</div>
                    <div className='cvat-canvas3d-fullsize' ref={topView} />
                </div>
                <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-sideview'>
                    <div className='cvat-canvas3d-header'>SIDE VIEW</div>
                    <div className='cvat-canvas3d-fullsize' ref={sideView} />
                </div>
                <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-frontview'>
                    <div className='cvat-canvas3d-header'>FRONT VIEW</div>
                    <div className='cvat-canvas3d-fullsize' ref={frontView} />
                </div>
                <div className='cvat-canvas3d-view-slider' />
            </div>
        </Layout.Content>
    );
};

export default React.memo(CanvasWrapperComponent);
