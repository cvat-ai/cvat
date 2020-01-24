import './styles.scss';
import React from 'react';

import {
    Layout,
} from 'antd';

import CanvasWrapperContainer from 'containers/annotation-page/standard-workspace/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import ObjectSideBarContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';


export default function StandardWorkspaceComponent(): JSX.Element {
    return (
        <Layout hasSider>
            <ControlsSideBarContainer />
            <CanvasWrapperContainer />
            <ObjectSideBarContainer />
        </Layout>
    );
}
