import './styles.scss';
import React from 'react';

import {
    Layout,
} from 'antd';

import ControlsSideBarComponent from './controls-side-bar';
import CanvasWrapperComponent from './canvas-wrapper-component';
import ObjectSideBarComponent from './objects-side-bar/objects-side-bar';

export default function StandardWorkspaceComponent(): JSX.Element {
    return (
        <Layout>
            <ControlsSideBarComponent />
            <CanvasWrapperComponent />
            <ObjectSideBarComponent />
        </Layout>
    );
}
