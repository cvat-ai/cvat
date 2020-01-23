import './styles.scss';
import React from 'react';

import {
    Layout,
} from 'antd';

import { Canvas } from 'cvat-canvas';

import CanvasWrapperContainer from 'containers/annotation-page/standard-workspace/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import ObjectSideBarComponent from './objects-side-bar/objects-side-bar';

interface Props {
    canvasInstance: Canvas;
}

export default function StandardWorkspaceComponent(props: Props): JSX.Element {
    const {
        canvasInstance,
    } = props;

    return (
        <Layout hasSider>
            <ControlsSideBarContainer />
            <CanvasWrapperContainer />
            <ObjectSideBarComponent
                onSidebarFoldUnfold={(): void => {
                    canvasInstance.fitCanvas();
                }}
            />
        </Layout>
    );
}
