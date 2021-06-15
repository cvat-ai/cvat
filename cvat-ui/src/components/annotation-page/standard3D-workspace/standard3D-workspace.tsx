// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasWrapperContainer from 'containers/annotation-page/canvas/canvas-wrapper3D';
import ControlsSideBarContainer from 'containers/annotation-page/standard3D-workspace/controls-side-bar/controls-side-bar';

export default function StandardWorkspace3DComponent(): JSX.Element {
    return (
        <Layout hasSider className='cvat-standard-workspace'>
            <ControlsSideBarContainer />
            <CanvasWrapperContainer />
        </Layout>
    );
}
