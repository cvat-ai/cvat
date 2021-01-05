// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { GlobalHotKeys } from 'react-hotkeys';
import Layout from 'antd/lib/layout/layout';


import {
 ObjectType, Workspace,
} from 'reducers/interfaces';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import consts from 'consts';
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
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    constructor(props){
        super(props)
        this.animateID="";
    }

    public componentDidMount(): void {
        const {
            automaticBordering, showObjectsTextAlways, canvasInstance, workspace,
        } = this.props;

        const [wrapper] = window.document.getElementsByClassName('cvat-canvas-container');
        wrapper.appendChild(canvasInstance.html());

        canvasInstance.configure({
            autoborders: automaticBordering,
            undefinedAttrValue: consts.UNDEFINED_ATTRIBUTE_VALUE,
            displayAllText: showObjectsTextAlways,
            forceDisableEditing: [Workspace.ATTRIBUTE_ANNOTATION, Workspace.REVIEW_WORKSPACE].includes(workspace),
        });

        this.initialSetup();
        this.updateCanvas();
        this.animateCanvas()
    }

    public componentDidUpdate(prevProps: Props): void {
        const {
            frameData,
            annotations,
            curZLayer,
        } = this.props;

        if (
            prevProps.annotations !== annotations ||
            prevProps.frameData !== frameData ||
            prevProps.curZLayer !== curZLayer
        ) {
            this.updateCanvas();
        }
    }

    public animateCanvas(){
        const {
             canvasInstance,
        } = this.props;

        canvasInstance.render()
        this.animateId= requestAnimationFrame(this.animateCanvas.bind(this))
    }

    public componentWillUnmount(): void {
        window.removeEventListener('resize', this.fitCanvas);
        cancelAnimationFrame(this.animateId);
    }

    private fitCanvas = (): void => {
        const { canvasInstance } = this.props;
        canvasInstance.fitCanvas();
    };

    private onCanvasSetup = (): void => {
        const { onSetupCanvas } = this.props;
        onSetupCanvas();
    };

    private updateCanvas(): void {
        const {
            curZLayer, annotations, frameData, canvasInstance,
        } = this.props;

        if (frameData !== null) {
            canvasInstance.setup(
                frameData,
                annotations.filter((e) => e.objectType !== ObjectType.TAG),
                curZLayer,
            );
        }
    }

    private initialSetup(): void {
        const {
            canvasInstance,
        } = this.props;

        // Size
        window.addEventListener('resize', this.fitCanvas);
        this.fitCanvas();

        // Events
        canvasInstance.html().addEventListener(
            'canvas.setup',
            () => { },
            { once: true },
        );
        canvasInstance.html().addEventListener('canvas.setup', this.onCanvasSetup);
    }

    public render(): JSX.Element {
        const {
            frame,
            contextImageHide,
            getContextImage,
            loaded,
            data
        } = this.props;

        return (
            <Layout.Content style={{ position: 'relative' }}>
                <GlobalHotKeys />
                {/*
                    This element doesn't have any props
                    So, React isn't going to rerender it
                    And it's a reason why cvat-canvas appended in mount function works
                */}
                <ContextImage
                    frame={frame}
                    contextImageHide={contextImageHide}
                    getContextImage={getContextImage}
                    loaded={loaded} data={data}
                />
                <div
                    className='cvat-canvas-container'
                    style={{
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%',
                    }}
                />
            </Layout.Content>
        );
    }
}
