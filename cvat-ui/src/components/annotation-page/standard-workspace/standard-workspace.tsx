import './styles.scss';
import React from 'react';

import {
    Layout,
} from 'antd';

import { Canvas } from '../../../canvas';

import ControlsSideBarComponent from './controls-side-bar';
import CanvasWrapperComponent from './canvas-wrapper-component';
import ObjectSideBarComponent from './objects-side-bar/objects-side-bar';

interface Props {
    canvasInstance: Canvas;
    jobInstance: any;
    annotations: any[];
    frameData: any;
    onCanvasSetup: () => void;
}

export default function StandardWorkspaceComponent(props: Props): JSX.Element {
    const {
        canvasInstance,
        jobInstance,
        annotations,
        frameData,
        onCanvasSetup,
    } = props;

    return (
        <Layout hasSider>
            <ControlsSideBarComponent />
            <CanvasWrapperComponent
                canvasInstance={canvasInstance}
                onCanvasSetup={onCanvasSetup}
                jobInstance={jobInstance}
                annotations={annotations}
                frameData={frameData}
            />
            <ObjectSideBarComponent
                onSidebarFoldUnfold={(): void => {
                    canvasInstance.fitCanvas();
                }}
            />
        </Layout>
    );
}
