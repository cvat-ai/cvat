// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactElement, useEffect, useRef } from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import Layout from 'antd/lib/layout/layout';

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
    const cvatCanvasContainerRef = useRef();

    const {
        frameData, contextImageHide, getContextImage, loaded, data, annotations, curZLayer,
    } = props;

    const fitCanvas = (): void => {
        const { canvasInstance } = props;
        canvasInstance.fitCanvas();
    };

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

        // Size
        window.addEventListener('resize', fitCanvas);
        fitCanvas();

        // Events
        canvasInstance.html().addEventListener('canvas.setup', onCanvasSetup);
    };

    useEffect(() => {
        const { canvasInstance } = props;

        cvatCanvasContainerRef.current.appendChild(canvasInstance.html());

        initialSetup();
        updateCanvas();
        animateCanvas();

        return () => {
            canvasInstance.html().removeEventListener('canvas.setup', onCanvasSetup);
            window.removeEventListener('resize', fitCanvas);
            cancelAnimationFrame(animateId.current);
        };
    });

    useEffect(() => {
        updateCanvas();
    }, [frameData, annotations, curZLayer]);

    return (
        <Layout.Content style={{ position: 'relative' }}>
            <GlobalHotKeys />
            <ContextImage
                frame={frameData}
                contextImageHide={contextImageHide}
                getContextImage={getContextImage}
                loaded={loaded}
                data={data}
            />
            <div ref={cvatCanvasContainerRef} className='cvat-canvas-container cvat-canvas-container-overflow' />
        </Layout.Content>
    );
};

export default React.memo(CanvasWrapperComponent);
